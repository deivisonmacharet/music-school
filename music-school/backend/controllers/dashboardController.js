const db = require('../config/database');

exports.getDashboard = async (req, res) => {
  try {
    // Total de alunos ativos
    const [totalStudents] = await db.query(
      'SELECT COUNT(*) as total FROM students WHERE active = TRUE'
    );

    // Total de professores ativos
    const [totalTeachers] = await db.query(
      'SELECT COUNT(*) as total FROM teachers WHERE active = TRUE'
    );

    // Total de turmas ativas
    const [totalClasses] = await db.query(
      'SELECT COUNT(*) as total FROM classes WHERE active = TRUE'
    );

    // Próximos eventos
    const [upcomingEvents] = await db.query(
      'SELECT * FROM events WHERE active = TRUE AND event_date >= CURDATE() ORDER BY event_date ASC LIMIT 5'
    );

    // Pagamentos pendentes
    const [pendingPayments] = await db.query(`
      SELECT COUNT(*) as total, SUM(amount) as total_amount
      FROM payments 
      WHERE status = 'pending'
    `);

    // Pagamentos atrasados
    const [overduePayments] = await db.query(`
      SELECT COUNT(*) as total, SUM(amount) as total_amount
      FROM payments 
      WHERE status = 'pending' AND due_date < CURDATE()
    `);

    // Receita do mês atual
    const [monthRevenue] = await db.query(`
      SELECT SUM(amount) as total
      FROM payments 
      WHERE status = 'paid' 
        AND YEAR(payment_date) = YEAR(CURDATE())
        AND MONTH(payment_date) = MONTH(CURDATE())
    `);

    // Alunos inadimplentes
    const [defaulters] = await db.query(`
      SELECT DISTINCT s.id, s.name, s.phone, COUNT(p.id) as overdue_count, SUM(p.amount) as total_debt
      FROM students s
      JOIN payments p ON s.id = p.student_id
      WHERE p.status = 'pending' AND p.due_date < CURDATE()
      GROUP BY s.id, s.name, s.phone
      ORDER BY total_debt DESC
      LIMIT 10
    `);

    // Estatísticas de frequência do mês
    const [attendanceStats] = await db.query(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
      FROM class_attendances
      WHERE YEAR(attendance_date) = YEAR(CURDATE())
        AND MONTH(attendance_date) = MONTH(CURDATE())
    `);

    // Matrículas por instrumento
    const [enrollmentsByInstrument] = await db.query(`
      SELECT i.name, COUNT(DISTINCT ce.student_id) as total
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN instruments i ON c.instrument_id = i.id
      WHERE ce.status = 'active' AND c.type = 'instrument'
      GROUP BY i.name
      ORDER BY total DESC
    `);

    // Receita dos últimos 6 meses
    const [revenueByMonth] = await db.query(`
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') as month,
        SUM(amount) as total
      FROM payments
      WHERE status = 'paid'
        AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json({
      summary: {
        totalStudents: totalStudents[0].total,
        totalTeachers: totalTeachers[0].total,
        totalClasses: totalClasses[0].total,
        pendingPayments: pendingPayments[0].total,
        pendingPaymentsAmount: pendingPayments[0].total_amount || 0,
        overduePayments: overduePayments[0].total,
        overduePaymentsAmount: overduePayments[0].total_amount || 0,
        monthRevenue: monthRevenue[0].total || 0
      },
      upcomingEvents,
      defaulters,
      attendanceStats: attendanceStats[0],
      enrollmentsByInstrument,
      revenueByMonth
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};

exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    if (!studentId) {
      return res.status(400).json({ error: 'Aluno não encontrado' });
    }

    // Turmas matriculadas
    const [myClasses] = await db.query(`
      SELECT c.*, i.name as instrument_name, t.name as teacher_name
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN instruments i ON c.instrument_id = i.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE ce.student_id = ? AND ce.status = 'active'
    `, [studentId]);

    // Próximos eventos
    const [myEvents] = await db.query(`
      SELECT e.*
      FROM event_participants ep
      JOIN events e ON ep.event_id = e.id
      WHERE ep.student_id = ? AND e.event_date >= CURDATE()
      ORDER BY e.event_date ASC
    `, [studentId]);

    // Pagamentos pendentes
    const [myPayments] = await db.query(`
      SELECT * FROM payments
      WHERE student_id = ? AND status = 'pending'
      ORDER BY due_date ASC
    `, [studentId]);

    // Estatísticas de frequência
    const [myAttendance] = await db.query(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
      FROM class_attendances
      WHERE student_id = ?
        AND YEAR(attendance_date) = YEAR(CURDATE())
        AND MONTH(attendance_date) = MONTH(CURDATE())
    `, [studentId]);

    res.json({
      myClasses,
      myEvents,
      myPayments,
      attendance: myAttendance[0]
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};
