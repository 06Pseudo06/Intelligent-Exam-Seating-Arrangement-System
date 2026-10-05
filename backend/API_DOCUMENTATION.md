# Intelligent Exam Seating Arrangement System — REST API Documentation

Base URL:
```text
http://localhost:5000/api
```

---

## 1. System Health & Metadata

### `GET /api/health`
Checks database connectivity and server status.

* **Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-10-05T12:00:00.000Z"
}
```

---

## 2. Dashboard Analytics

### `GET /api/dashboard/stats`
Aggregates candidate rosters, available classroom inventories, upcoming exam timetables, capacity occupancy ratios, and metrics from the most recent seating generation run.

* **Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalStudents": 220,
    "totalClassrooms": 5,
    "totalExams": 4,
    "totalSeatingPlans": 1,
    "totalSeats": 254,
    "occupancyPercentage": 87,
    "latestPlan": {
      "planId": 1,
      "examId": 1,
      "totalStudents": 150,
      "occupiedSeats": 150,
      "emptySeats": 104,
      "conflictCount": 0,
      "executionTimeMs": 1.42
    }
  }
}
```

---

## 3. Seating Allocation (C++ Engine Pipeline)

### `POST /api/seating/generate`
Triggers the native C++ optimization engine for a specified assessment session. Validates timetable clashes, extracts candidate registrations and room geometry, executes the solver with unique temporary IPC files, and writes records within an ACID MySQL transaction.

* **Request Body:**
```json
{
  "examId": 1,
  "classroomIds": [1, 2, 3]
}
```

* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Seating plan generated successfully.",
  "data": {
    "planId": 12,
    "assignments": [
      {
        "studentId": 1,
        "rollNo": "23BCS001",
        "section": "A",
        "classroomId": 1,
        "row": 1,
        "col": 1,
        "seatLabel": "R1C1",
        "decision": {
          "score": 0,
          "orthogonalPenalty": 0,
          "diagonalPenalty": 0,
          "strategy": "Snake"
        }
      }
    ],
    "summary": {
      "totalStudents": 150,
      "totalRooms": 3,
      "occupiedSeats": 150,
      "emptySeats": 10,
      "occupancyPercentage": 93.75,
      "orthogonalConflicts": 0,
      "diagonalConflicts": 0,
      "totalConflicts": 0,
      "averageConflictScore": 0.0,
      "executionTimeMs": 1.85
    }
  }
}
```

### `GET /api/seating/:examId`
Retrieves the active seating grid plan and assigned candidate roster for an examination.

* **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "plan_id": 12,
      "student_id": 1,
      "roll_no": "23BCS001",
      "studentName": "Student1 Test",
      "department_code": "CSE",
      "room_no": "LH101",
      "row_no": 1,
      "col_no": 1,
      "seat_label": "R1C1"
    }
  ]
}
```

---

## 4. Student Directory & CSV Import

* `GET /api/students`: Lists all active student directory records.
* `GET /api/students/details`: Returns student directory with joined department names and home zones.
* `GET /api/students/:id`: Retrieves single student profile.
* `POST /api/students`: Registers a new student.
* `PUT /api/students/:id`: Updates student details.
* `DELETE /api/students/:id`: Deletes student record.
* `POST /api/students/upload`: Multipart form-data CSV roster parser with deduplication on duplicate keys (`ON DUPLICATE KEY UPDATE`).

---

## 5. Classroom Inventory

* `GET /api/classrooms`: Lists all examination halls and capacity matrices.
* `GET /api/classrooms/availability/:examId`: Evaluates time-clashes against concurrent exam timetables on the same date.
* `GET /api/classrooms/:id`: Retrieves classroom dimensions.
* `POST /api/classrooms`: Registers new examination hall with Row × Column grid.
* `PUT /api/classrooms/:id`: Modifies classroom dimensions and capacity.
* `DELETE /api/classrooms/:id`: Removes classroom from inventory.

---

## 6. Examination Sessions & Candidate Registrations

* `GET /api/exams`: Lists scheduled examination cards.
* `POST /api/exams`: Creates examination timetable schedule.
* `PUT /api/exams/:id`: Updates examination schedule details.
* `DELETE /api/exams/:id`: Deletes examination record.
* `GET /api/registrations/exam/:examId`: Lists all students enrolled in an exam session.
* `POST /api/registrations/bulk`: Batch registers candidate IDs to an exam session (`INSERT IGNORE`).
* `POST /api/registrations/bulk-delete`: Batch unregisters candidate IDs from an exam session.
