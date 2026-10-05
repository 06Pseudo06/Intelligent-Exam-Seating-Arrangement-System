# Intelligent Exam Seating Arrangement System

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5+-blue.svg)](https://www.typescriptlang.org/)
[![C++](https://img.shields.io/badge/C++-17-darkblue.svg)](https://en.cppreference.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

An optimized, full-stack application designed to automate and manage candidate seating layout plans for university examinations. The core layout computation is offloaded to a high-speed, constraint-based **C++17 native allocation engine**, paired with a **Node.js/Express** REST API middleware layer, a relational **MySQL** persistence store with connection pooling and ACID transactions, and a responsive **React 19 / TypeScript** single-page application dashboard.

---

## 🏛 Architecture Overview

```
                      +---------------------------------------+
                      |         React 19 / TypeScript         |
                      |        Vite + Tailwind CSS SPA        |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS / REST (JSON)
                                          v
                      +---------------------------------------+
                      |          Express 5 API Gateway        |
                      |  - Input Validation & Timetable Logic |
                      |  - Connection Pooling (mysql2)        |
                      |  - Process Isolation & Execution      |
                      +---------+-------------------+---------+
                                |                   |
                 Transactional  |                   | child_process.spawn
                 ACID Queries   |                   | (Isolated OS temp files)
                                v                   v
          +-----------------------+     +-------------------------------+
          |       MySQL 8.0       |     |     C++17 Allocation Engine   |
          |  Relational Database  |     |  - Pre-flight Invariant Check |
          |  (Candidates, Halls,  |     |  - Max-Heap Cooldown Stream   |
          |   Exams, Assignments) |     |  - Multi-Traversal Solver     |
          +-----------------------+     |  - Spatial Penalty Scorer     |
                                        +-------------------------------+
```

---

## 🚀 Key Features

* **Interactive 2D Spatial Layout Grid**: True-to-life visualization of classroom desk blueprints ($Rows \times Columns$) color-coded by candidate departments, featuring interactive desk hover cards, live search, scale zoom controls, and section filtering.
* **Frequency-Balanced Optimization Engine**: Offloads combinatorial seat placement to a native C++ solver using dynamic cooldown queues and spatial penalty objective functions to prevent candidate collusion and same-section clustering.
* **Timetable Clash Detection**: Automatically detects and prevents double-booking of classrooms across concurrent exam sessions on the same date and overlapping time intervals.
* **Candidate Roster Management**: Full CRUD for students and exam registrations, including bulk CSV imports with schema normalization and deduplication.
* **ACID Persistence**: Atomically cleans old arrangements and writes new seating plans and individual seat assignments inside single rollback-safe database transactions.
* **Data Portability**: Export generated seating charts directly as formatted CSV tables or serialized JSON logs for printing and physical exam hall posting.

---

## ⚙️ Allocation Algorithm & Constraints

The seating solver pipeline is implemented in modular C++17 (`cpp-engine/`):

```text
[Input JSON] ──> [Validator] ──> [Balancer] ──> [Distributor] ──> [Allocator & Scorer] ──> [Statistics Audit] ──> [Output JSON]
```

### 1. Invariant Validation (Hard Constraints)
The engine validates 9 pre-flight invariants before processing:
* Non-empty candidate and classroom lists.
* Global uniqueness of Student IDs, Roll Numbers, and Classroom IDs.
* Mandatory candidate section assignments.
* Positive non-zero room grid dimensions ($rows > 0 \land cols > 0$).
* Aggregate venue capacity $\ge$ total registered candidates.
* Seat exclusivity invariant (at most one student per grid coordinate).

### 2. Stream Interleaving & Section Balancing
Candidates are grouped by academic section into FIFO queues. A **Max-Heap Priority Queue** paired with a **Dynamic Cooldown Ring** interleaves students from the highest-density sections with a spacing cooldown $T = \max(2, \lfloor N / \text{freq}_{max} \rfloor)$, guaranteeing that candidates from identical branches are not placed consecutively in the pipeline.

### 3. Spatial Penalty Scoring
Candidates are placed along configurable 2D grid traversals (**Snake**, **Spiral**, **Checkerboard**, **Center-Out**, or **Row-Major**). The solver evaluates each empty desk against an objective scoring function:

$$\min S(r, c) = P_{\text{ortho}} + P_{\text{diag}} + P_{\text{dist2}} + P_{\text{row}} + P_{\text{col}}$$

* **Orthogonal Penalty ($P_{\text{ortho}}$)**: $+10$ per same-section neighbor in 4-cardinal directions (Up, Down, Left, Right), with $+100,000$ offset penalty if strict adjacency avoidance is enabled.
* **Diagonal Penalty ($P_{\text{diag}}$)**: $+3$ per same-section neighbor in 4-diagonal directions.
* **Proximity Penalty ($P_{\text{dist2}}$)**: $+1$ per same-section candidate within Manhattan distance $\le 2$ ($5 \times 5$ subgrid).
* **Row/Column Clustering Penalties**: $+1$ if $\ge 2$ same-section students share the row; $+2$ if $\ge 2$ share the column.

### 4. Post-Allocation Conflict Audit
Statistics calculates independent single-pass conflict counts (scanning Right, Down, Down-Right, and Down-Left to avoid double counting) to verify arrangement integrity.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | Responsive SPA dashboard and interactive 2D room matrix |
| **Backend** | Node.js (v20+), Express 5 | REST API gateway, validation, and child process orchestration |
| **Database** | MySQL 8.0, `mysql2` Pool | Relational store with foreign keys, cascading plans, and transactions |
| **Engine** | Native C++17 (STL, CMake/Make) | High-speed combinatorial constraint solver and statistics auditor |
| **DevOps** | Docker, Docker Compose, Nginx | Multi-stage container builds and unified local orchestration |

---

## 📂 Project Structure

```
├── .env.example                     # Environment template for Docker Compose
├── docker-compose.yml               # Multi-container orchestration (DB + Backend + Frontend)
├── README.md                        # Primary project documentation
│
├── backend/
│   ├── Dockerfile                   # Multi-stage build (C++ compiler + Node runtime)
│   ├── package.json                 # Express, mysql2, multer, csv-parser
│   ├── server.js                    # Express application entry & health checks
│   ├── database/
│   │   ├── schema.sql               # Relational DDL definitions
│   │   └── sample_data.sql          # Test dataset (Departments, Students, Halls, Exams)
│   ├── src/
│   │   ├── config/db.js             # MySQL connection pool
│   │   ├── controllers/             # Express route controllers
│   │   ├── routes/                  # Express endpoint definitions
│   │   └── services/                # Seating transaction & C++ allocator runner
│   └── tests/                       # Automated API & C++ runner test suites
│
├── cpp-engine/
│   ├── CMakeLists.txt / Makefile    # Cross-platform build configurations
│   ├── include/ & src/              # C++ solver source modules
│   ├── tests/                       # C++ native unit tests (Validation & Balancer)
│   └── test/                        # 17 regression test fixtures
│
└── frontend/
    ├── Dockerfile & nginx.conf      # Production Nginx SPA build
    ├── package.json                 # React 19, Vite, Tailwind CSS v4, Lucide
    └── src/
        ├── components/              # UI components, modals, stat cards, tables
        ├── pages/                   # Dashboard, Students, Classrooms, Exams, SeatingPlan
        ├── routes/                  # SPA client router
        └── services/                # Axios API services
```

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the complete system with the native C++ engine compiled automatically:

```bash
# 1. Clone the repository
git clone https://github.com/shruti316/Intelligent-Exam-Seating-Arrangement-System.git
cd Intelligent-Exam-Seating-Arrangement-System

# 2. Start all services via Docker Compose
docker compose up --build
```

* **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
* **MySQL Database**: `localhost:3306` (Pre-seeded with sample data)

---

## 💻 Manual Local Development Setup

### 1. Database Setup
1. Start a local MySQL server instance.
2. Initialize tables and seed data:
   ```bash
   mysql -u root -p < backend/database/schema.sql
   mysql -u root -p < backend/database/sample_data.sql
   ```

### 2. Compile C++ Allocation Engine
```bash
cd cpp-engine
# Using GCC / Clang on Windows/Linux:
g++ -std=c++17 -O3 src/*.cpp -Iinclude -o allocator.exe  # On Windows
# OR
g++ -std=c++17 -O3 src/*.cpp -Iinclude -o allocator      # On Linux / macOS
```

### 3. Start Backend Server
```bash
cd backend
cp .env.example .env
# Configure database credentials inside .env
npm install
npm run dev
```

### 4. Start Frontend Application
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## 🧪 Testing & Quality Assurance

### 1. Backend & Integration Tests
Automated test suites verify API endpoints, missing parameter validations, and native C++ binary execution:
```bash
cd backend
npm test
```

### 2. C++ Native Unit Tests
Validates algorithm invariants, frequency ordering, and edge cases:
```bash
cd cpp-engine
g++ -std=c++17 tests/*.cpp src/validator.cpp src/balancer.cpp src/traversal.cpp src/scorer.cpp src/distributor.cpp src/statistics.cpp -Iinclude -o test_runner
./test_runner
```

### 3. C++ Regression Test Harness (Windows)
Executes 17 comprehensive JSON test suites (capacity overflows, duplicate IDs, single-section cohorts, large rosters):
```bash
cd cpp-engine
.\run_tests.bat
```

---

## 🌐 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and database connectivity check |
| `GET` | `/api/dashboard/stats` | Aggregated roster KPIs and latest allocation metrics |
| `POST` | `/api/seating/generate` | Triggers C++ solver and persists seating plan in a transaction |
| `GET` | `/api/seating/:examId` | Retrieves active 2D seating layout for an exam |
| `GET` | `/api/students` | Lists all candidate profiles |
| `POST` | `/api/students/upload` | Multipart CSV candidate roster parser and importer |
| `GET` | `/api/classrooms` | Lists classroom capacity dimensions |
| `GET` | `/api/classrooms/availability/:examId` | Checks hall availability against overlapping exam schedules |
| `GET` | `/api/exams` | Lists exam timetables |
| `POST` | `/api/registrations/bulk` | Batch enrolls candidates into an exam session |

---

## 🔒 Security & Robustness Measures

* **Environment Isolation**: No production passwords or credentials stored in source code.
* **Process Safety**: Native C++ solver runs as an isolated subprocess with execution timeouts and randomized temporary file paths (`os.tmpdir()`) to prevent concurrency race conditions.
* **ACID Transactions**: Relational rollback safety prevents partial seat assignment writes on allocation failure.
* **Parameterized Queries**: All database inputs utilize prepared statements (`?`) to prevent SQL injection.

---

## 📄 License
This project is licensed under the ISC License.
