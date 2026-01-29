const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly, adminOrEmployee } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const teacherController = require('../controllers/teacherController');
const classController = require('../controllers/classController');
const paymentController = require('../controllers/paymentController');
const eventController = require('../controllers/eventController');
const attendanceController = require('../controllers/attendanceController');
const dashboardController = require('../controllers/dashboardController');

// Auth routes
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// Dashboard routes
router.get('/dashboard', authMiddleware, adminOrEmployee, dashboardController.getDashboard);
router.get('/dashboard/student', authMiddleware, dashboardController.getStudentDashboard);

// Student routes
router.get('/students', authMiddleware, adminOrEmployee, studentController.getAll);
router.get('/students/:id', authMiddleware, studentController.getById);
router.post('/students', authMiddleware, adminOrEmployee, studentController.create);
router.put('/students/:id', authMiddleware, adminOrEmployee, studentController.update);
router.delete('/students/:id', authMiddleware, adminOnly, studentController.delete);

// Teacher routes
router.get('/teachers', authMiddleware, teacherController.getAll);
router.get('/teachers/:id', authMiddleware, teacherController.getById);
router.post('/teachers', authMiddleware, adminOnly, teacherController.create);
router.put('/teachers/:id', authMiddleware, adminOnly, teacherController.update);
router.delete('/teachers/:id', authMiddleware, adminOnly, teacherController.delete);

// Class routes
router.get('/classes', authMiddleware, classController.getAll);
router.get('/classes/:id', authMiddleware, classController.getById);
router.post('/classes', authMiddleware, adminOrEmployee, classController.create);
router.put('/classes/:id', authMiddleware, adminOrEmployee, classController.update);
router.delete('/classes/:id', authMiddleware, adminOnly, classController.delete);
router.post('/classes/:id/enroll', authMiddleware, adminOrEmployee, classController.enrollStudent);
router.delete('/classes/:id/students/:studentId', authMiddleware, adminOrEmployee, classController.removeStudent);

// Payment routes
router.get('/payments', authMiddleware, adminOrEmployee, paymentController.getAll);
router.get('/payments/:id', authMiddleware, paymentController.getById);
router.post('/payments', authMiddleware, adminOrEmployee, paymentController.create);
router.put('/payments/:id', authMiddleware, adminOrEmployee, paymentController.update);
router.post('/payments/:id/pay', authMiddleware, adminOrEmployee, paymentController.markAsPaid);
router.get('/payments/overdue/list', authMiddleware, adminOrEmployee, paymentController.getOverdue);
router.post('/payments/generate/monthly', authMiddleware, adminOnly, paymentController.generateMonthlyPayments);
router.get('/payments/:id/receipt', authMiddleware, paymentController.getReceipt);

// Event routes
router.get('/events', authMiddleware, eventController.getAll);
router.get('/events/:id', authMiddleware, eventController.getById);
router.post('/events', authMiddleware, adminOrEmployee, eventController.create);
router.put('/events/:id', authMiddleware, adminOrEmployee, eventController.update);
router.delete('/events/:id', authMiddleware, adminOnly, eventController.delete);
router.post('/events/:id/participants', authMiddleware, adminOrEmployee, eventController.addParticipant);
router.delete('/events/:id/participants/:studentId', authMiddleware, adminOrEmployee, eventController.removeParticipant);
router.post('/events/:id/attendance', authMiddleware, adminOrEmployee, eventController.markAttendance);
router.get('/events/:id/attendances', authMiddleware, eventController.getAttendances);

// Attendance routes
router.get('/attendances/class', authMiddleware, attendanceController.getByClass);
router.get('/attendances/student', authMiddleware, attendanceController.getByStudent);
router.post('/attendances', authMiddleware, adminOrEmployee, attendanceController.markAttendance);
router.post('/attendances/bulk', authMiddleware, adminOrEmployee, attendanceController.bulkMarkAttendance);
router.get('/attendances/stats', authMiddleware, attendanceController.getAttendanceStats);
router.get('/attendances/report', authMiddleware, adminOrEmployee, attendanceController.getAttendanceReport);

// Instruments routes (simple CRUD)
router.get('/instruments', authMiddleware, async (req, res) => {
  try {
    const db = require('../config/database');
    const [instruments] = await db.query('SELECT * FROM instruments WHERE active = TRUE ORDER BY name ASC');
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar instrumentos' });
  }
});

module.exports = router;
