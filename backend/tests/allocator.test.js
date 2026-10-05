const { describe, it } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { runAllocator, resolveAllocatorExecutable } = require("../src/services/allocatorService");

describe("C++ Allocation Engine Integration Tests", () => {
    it("should resolve the native allocator binary path", () => {
        const binPath = resolveAllocatorExecutable();
        assert.ok(binPath, "Allocator binary path should not be null or empty");
        assert.ok(fs.existsSync(binPath), `Allocator binary must exist at: ${binPath}`);
    });

    it("should successfully allocate a valid exam roster without errors", async () => {
        const tempDir = os.tmpdir();
        const inPath = path.join(tempDir, `test_in_valid_${Date.now()}.json`);
        const outPath = path.join(tempDir, `test_out_valid_${Date.now()}.json`);

        const testPayload = {
            students: [
                { studentId: 101, rollNo: "23CS001", departmentCode: "CSE", section: "A" },
                { studentId: 102, rollNo: "23CS002", departmentCode: "CSE", section: "A" },
                { studentId: 103, rollNo: "23IT001", departmentCode: "IT", section: "B" },
                { studentId: 104, rollNo: "23IT002", departmentCode: "IT", section: "B" }
            ],
            rooms: [
                { classroomId: 1, roomNo: "LH101", rows: 2, cols: 2 }
            ]
        };

        fs.writeFileSync(inPath, JSON.stringify(testPayload, null, 2), "utf8");

        try {
            const result = await runAllocator(inPath, outPath, "Snake");
            assert.strictEqual(result.success, true);
            assert.ok(fs.existsSync(outPath), "Output JSON must exist");

            const outputData = JSON.parse(fs.readFileSync(outPath, "utf8"));
            assert.strictEqual(outputData.success, true);
            assert.strictEqual(outputData.status, "success");
            assert.strictEqual(outputData.summary.totalStudents, 4);
            assert.strictEqual(outputData.summary.occupiedSeats, 4);
            assert.strictEqual(outputData.assignments.length, 4);
        } finally {
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
    });

    it("should fail gracefully when total students exceed aggregate room capacity", async () => {
        const tempDir = os.tmpdir();
        const inPath = path.join(tempDir, `test_in_overflow_${Date.now()}.json`);
        const outPath = path.join(tempDir, `test_out_overflow_${Date.now()}.json`);

        const testPayload = {
            students: [
                { studentId: 201, rollNo: "23CS001", departmentCode: "CSE", section: "A" },
                { studentId: 202, rollNo: "23CS002", departmentCode: "CSE", section: "A" },
                { studentId: 203, rollNo: "23CS003", departmentCode: "CSE", section: "B" }
            ],
            rooms: [
                { classroomId: 1, roomNo: "LH101", rows: 1, cols: 2 } // Capacity = 2 (shortage of 1)
            ]
        };

        fs.writeFileSync(inPath, JSON.stringify(testPayload, null, 2), "utf8");

        try {
            await assert.rejects(
                async () => {
                    await runAllocator(inPath, outPath, "Snake");
                },
                /Capacity Overflow|Exit code 107/i
            );
        } finally {
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
    });

    it("should fail gracefully when given empty student list", async () => {
        const tempDir = os.tmpdir();
        const inPath = path.join(tempDir, `test_in_empty_${Date.now()}.json`);
        const outPath = path.join(tempDir, `test_out_empty_${Date.now()}.json`);

        const testPayload = {
            students: [],
            rooms: [
                { classroomId: 1, roomNo: "LH101", rows: 2, cols: 2 }
            ]
        };

        fs.writeFileSync(inPath, JSON.stringify(testPayload, null, 2), "utf8");

        try {
            await assert.rejects(
                async () => {
                    await runAllocator(inPath, outPath, "Snake");
                },
                /Empty students|Exit code 100/i
            );
        } finally {
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
    });
});
