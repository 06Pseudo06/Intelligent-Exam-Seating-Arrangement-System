const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./src/config/db');
const app = express();

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive default for local dev
    },
    credentials: true
}));

app.use(express.json());

// Root & Health Checks
app.get('/', (req, res) => {
    res.json({
        name: 'Intelligent Exam Seating Arrangement System API',
        status: 'active',
        version: '1.0.0'
    });
});

app.get('/api/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            return res.status(503).json({
                status: 'degraded',
                database: 'disconnected',
                error: err.message
            });
        }
        res.status(200).json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    });
});

// Domain Routes
const departmentRoutes = require("./src/routes/departmentRoutes");
app.use("/api/departments", departmentRoutes);

const studentRoutes = require("./src/routes/studentRoutes");
app.use("/api/students", studentRoutes);

const classroomRoutes = require("./src/routes/classroomRoutes");
app.use("/api/classrooms", classroomRoutes);

const examRoutes = require("./src/routes/examRoutes");
app.use("/api/exams", examRoutes);

const registrationRoutes = require("./src/routes/registrationRoutes");
app.use("/api/registrations", registrationRoutes);

const seatingPlanRoutes = require("./src/routes/seatingPlanRoutes");
app.use("/api/seating-plans", seatingPlanRoutes);

const seatAssignmentRoutes = require("./src/routes/seatAssignmentRoutes");
app.use("/api/seat-assignments", seatAssignmentRoutes);

const seatingRoutes = require("./src/routes/seatingRoutes");
app.use("/api/seating", seatingRoutes);

const dashboardRoutes = require("./src/routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

// Centralized 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found.`
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
