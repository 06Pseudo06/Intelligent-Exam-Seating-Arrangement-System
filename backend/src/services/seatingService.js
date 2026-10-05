const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const util = require("util");
const { runAllocator } = require("./allocatorService");

const queryPoolAsync = util.promisify(db.query).bind(db);
const getConnectionAsync = util.promisify(db.getConnection).bind(db);

const cleanupFiles = (inPath, outPath) => {
    try {
        if (inPath && fs.existsSync(inPath)) fs.unlinkSync(inPath);
    } catch (e) {
        console.error("Cleanup error for input file:", e.message);
    }
    try {
        if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch (e) {
        console.error("Cleanup error for output file:", e.message);
    }
};

const generateSeating = async (examId, classroomIds) => {
    let inputPath = null;
    let outputPath = null;

    try {
        // ===========================
        // 1. Validate Exam & Schedule
        // ===========================
        const examQuery = `
            SELECT 
                exam_id,
                exam_name,
                subject_code,
                subject_name,
                exam_date,
                TIME_FORMAT(start_time, '%H:%i') AS start_time_str,
                TIME_FORMAT(end_time, '%H:%i') AS end_time_str,
                start_time,
                end_time
            FROM exams
            WHERE exam_id = ?;
        `;
        const exams = await queryPoolAsync(examQuery, [examId]);

        if (!exams || exams.length === 0) {
            throw new Error(`Exam with ID ${examId} not found.`);
        }

        const currentExam = exams[0];
        const examDateFormatted = currentExam.exam_date instanceof Date 
            ? currentExam.exam_date.toISOString().substring(0, 10) 
            : currentExam.exam_date;

        // ===========================
        // 2. Query Classroom Time-Conflicts for Concurrent Exams
        // ===========================
        const conflictQuery = `
            SELECT DISTINCT
                sa.classroom_id,
                c.room_no,
                e.exam_id,
                e.exam_name,
                e.subject_name,
                e.subject_code,
                e.exam_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(e.end_time, '%H:%i') AS end_time
            FROM seat_assignments sa
            JOIN seating_plans sp ON sa.plan_id = sp.plan_id
            JOIN exams e ON sp.exam_id = e.exam_id
            JOIN classrooms c ON sa.classroom_id = c.classroom_id
            WHERE e.exam_id != ?
              AND e.exam_date = ?
              AND e.start_time < ?
              AND e.end_time > ?;
        `;
        const occupiedRooms = await queryPoolAsync(conflictQuery, [
            examId, 
            currentExam.exam_date, 
            currentExam.end_time, 
            currentExam.start_time
        ]);

        // Check if user explicitly selected any classroom that is already occupied
        if (classroomIds && classroomIds.length > 0 && occupiedRooms && occupiedRooms.length > 0) {
            const conflicting = occupiedRooms.find(occ => classroomIds.includes(occ.classroom_id));
            if (conflicting) {
                throw new Error(
                    `Classroom ${conflicting.room_no} is unavailable. It is already assigned to "${conflicting.subject_name || conflicting.exam_name}" from ${conflicting.start_time} to ${conflicting.end_time} on ${examDateFormatted}.`
                );
            }
        }

        // ===========================
        // 3. Get Registered Students
        // ===========================
        const studentQuery = `
            SELECT
                s.student_id AS studentId,
                s.roll_no AS rollNo,
                d.department_code AS departmentCode,
                s.section
            FROM exam_registrations er
            JOIN students s
                ON er.student_id = s.student_id
            JOIN departments d
                ON s.department_id = d.department_id
            WHERE er.exam_id = ?
            ORDER BY s.roll_no;
        `;
        const students = await queryPoolAsync(studentQuery, [examId]);

        if (!students || students.length === 0) {
            throw new Error("No students are registered for this exam. Please register students before generating the seating plan.");
        }

        // ===========================
        // 4. Get Rooms (Excluding conflicting rooms if not explicitly filtered)
        // ===========================
        let roomQuery = `
            SELECT
                classroom_id AS classroomId,
                room_no AS roomNo,
                rows_count AS rowCount,
                cols_count AS colCount
            FROM classrooms
        `;

        let roomParams = [];
        if (classroomIds && classroomIds.length > 0) {
            roomQuery += ` WHERE classroom_id IN (?)`;
            roomParams.push(classroomIds);
        } else if (occupiedRooms && occupiedRooms.length > 0) {
            const occupiedIds = occupiedRooms.map(r => r.classroom_id);
            roomQuery += ` WHERE classroom_id NOT IN (?)`;
            roomParams.push(occupiedIds);
        }

        const rooms = await queryPoolAsync(roomQuery, roomParams);

        if (!rooms || rooms.length === 0) {
            throw new Error("No classrooms selected or available for this examination schedule.");
        }

        const formattedRooms = rooms.map(room => ({
            classroomId: room.classroomId,
            roomNo: room.roomNo,
            rows: room.rowCount,
            cols: room.colCount
        }));

        // ===========================
        // 5. Capacity Validation
        // ===========================
        const totalCapacity = formattedRooms.reduce(
            (sum, room) => sum + (room.rows * room.cols),
            0
        );

        if (students.length > totalCapacity) {
            throw new Error(
                `Insufficient classroom capacity. Registered students: ${students.length}, Available capacity: ${totalCapacity}. Shortage: ${students.length - totalCapacity} seats. Please select additional classrooms.`
            );
        }

        // ===========================
        // 6. Generate Unique Temporary Files & Execute C++ Allocator
        // ===========================
        const uniqueId = `${examId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const tempDir = os.tmpdir();
        inputPath = path.join(tempDir, `exam_alloc_in_${uniqueId}.json`);
        outputPath = path.join(tempDir, `exam_alloc_out_${uniqueId}.json`);

        const inputData = {
            students,
            rooms: formattedRooms
        };

        // Write input json
        fs.writeFileSync(inputPath, JSON.stringify(inputData, null, 2), "utf8");

        // Run C++ engine binary
        await runAllocator(inputPath, outputPath, "Snake");

        // Verify output json exists
        if (!fs.existsSync(outputPath)) {
            throw new Error("Allocator output file was not created by the engine.");
        }

        // Read output json
        const outputDataRaw = fs.readFileSync(outputPath, "utf8");
        let outputData;
        try {
            outputData = JSON.parse(outputDataRaw);
        } catch (e) {
            throw new Error("Allocator engine returned malformed JSON output.");
        }

        // Validate engine response status
        if (!outputData.success && outputData.status === "error") {
            const errMsg = (outputData.error && outputData.error.message) || outputData.error || "Allocator execution failed.";
            throw new Error(errMsg);
        }

        const assignments = outputData.assignments || [];
        const summary = outputData.summary || {};

        // ===========================
        // 7. Persist to Database via Dedicated Pool Connection Transaction
        // ===========================
        const connection = await getConnectionAsync();
        const connQuery = util.promisify(connection.query).bind(connection);
        const connBeginTransaction = util.promisify(connection.beginTransaction).bind(connection);
        const connCommit = util.promisify(connection.commit).bind(connection);
        const connRollback = util.promisify(connection.rollback).bind(connection);

        try {
            await connBeginTransaction();

            // Delete previous assignments for this exam
            const deleteAssignmentsQuery = `
                DELETE sa 
                FROM seat_assignments sa
                JOIN seating_plans sp ON sa.plan_id = sp.plan_id
                WHERE sp.exam_id = ?
            `;
            await connQuery(deleteAssignmentsQuery, [examId]);

            // Delete previous plans for this exam
            const deletePlanQuery = `
                DELETE FROM seating_plans
                WHERE exam_id = ?
            `;
            await connQuery(deletePlanQuery, [examId]);

            // Create new seating plan with summary statistics
            const insertPlanQuery = `
                INSERT INTO seating_plans
                (
                    exam_id, 
                    algorithm_version,
                    total_students,
                    occupied_seats,
                    empty_seats,
                    conflict_count,
                    execution_time_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const stats = [
                examId,
                "v1.0-cpp",
                summary.totalStudents || students.length,
                summary.occupiedSeats || assignments.length,
                summary.emptySeats || 0,
                summary.totalConflicts || 0,
                summary.executionTimeMs || 0.0
            ];
            const planResult = await connQuery(insertPlanQuery, stats);
            const newPlanId = planResult.insertId;

            // Batch insert all seat assignments
            if (assignments.length > 0) {
                const assignmentValues = assignments.map(a => [
                    newPlanId,
                    a.studentId,
                    a.classroomId,
                    a.row,
                    a.col,
                    a.seatLabel
                ]);

                const insertAssignmentsQuery = `
                    INSERT INTO seat_assignments
                    (
                        plan_id,
                        student_id,
                        classroom_id,
                        row_no,
                        col_no,
                        seat_label
                    )
                    VALUES ?
                `;
                await connQuery(insertAssignmentsQuery, [assignmentValues]);
            }

            await connCommit();

            return {
                success: true,
                planId: newPlanId,
                assignments,
                summary
            };

        } catch (txErr) {
            await connRollback().catch(() => {});
            throw txErr;
        } finally {
            connection.release();
            cleanupFiles(inputPath, outputPath);
        }

    } catch (err) {
        cleanupFiles(inputPath, outputPath);
        throw err;
    }
};

module.exports = {
    generateSeating
};