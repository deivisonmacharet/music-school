const db = require('../config/database');

exports.getByClass = async (req, res) => {
  try {
    const { class_id, start_date, end_date } = req.query;

    if (!class_id) {
      return res.status(400).json({ error: 'ID da turma é obrigatório' });
    }

    let query = `
      SELECT ca.*, s.name as student_name
      FROM class_attendances ca
      JOIN students s ON ca.student_id = s.id
      WHERE ca.class_id = ?
    `;
    const params = [class_id];

    if (start_date && end_date) {
      query += ' AND ca.attendance_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY ca.attendance_date DESC, s.name ASC';

    const [attendances] = await db.query(query, params);
    res.json(attendances);
  } catch (error) {
    console.error('Get attendances error:', error);
    res.status(500).json({ error: 'Erro ao buscar chamadas' });
  }
};

exports.getByStudent = async (req, res) => {
  try {
    const { student_id, start_date, end_date } = req.query;

    if (!student_id) {
      return res.status(400).json({ error: 'ID do aluno é obrigatório' });
    }

    let query = `
      SELECT ca.*, c.name as class_name, i.name as instrument_name
      FROM class_attendances ca
      JOIN classes c ON ca.class_id = c.id
      LEFT JOIN instruments i ON c.instrument_id = i.id
      WHERE ca.student_id = ?
    `;
    const params = [student_id];

    if (start_date && end_date) {
      query += ' AND ca.attendance_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY ca.attendance_date DESC';

    const [attendances] = await db.query(query, params);
    res.json(attendances);
  } catch (error) {
    console.error('Get student attendances error:', error);
    res.status(500).json({ error: 'Erro ao buscar frequência do aluno' });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { class_id, student_id, attendance_date, status, notes } = req.body;

    if (!class_id || !student_id || !attendance_date || !status) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    await db.query(
      `INSERT INTO class_attendances (class_id, student_id, attendance_date, status, notes) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = ?, notes = ?`,
      [class_id, student_id, attendance_date, status, notes, status, notes]
    );

    res.json({ message: 'Presença registrada com sucesso' });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Erro ao registrar presença' });
  }
};

exports.bulkMarkAttendance = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { class_id, attendance_date, attendances } = req.body;

    if (!class_id || !attendance_date || !attendances || !Array.isArray(attendances)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    for (const attendance of attendances) {
      await connection.query(
        `INSERT INTO class_attendances (class_id, student_id, attendance_date, status, notes) 
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = ?, notes = ?`,
        [
          class_id,
          attendance.student_id,
          attendance_date,
          attendance.status,
          attendance.notes || null,
          attendance.status,
          attendance.notes || null
        ]
      );
    }

    await connection.commit();

    res.json({ message: 'Chamada registrada com sucesso' });
  } catch (error) {
    await connection.rollback();
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Erro ao registrar chamada' });
  } finally {
    connection.release();
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { student_id, class_id, start_date, end_date } = req.query;

    if (!student_id && !class_id) {
      return res.status(400).json({ error: 'ID do aluno ou da turma é obrigatório' });
    }

    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'justified' THEN 1 ELSE 0 END) as justified,
        ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_rate
      FROM class_attendances
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ' AND student_id = ?';
      params.push(student_id);
    }

    if (class_id) {
      query += ' AND class_id = ?';
      params.push(class_id);
    }

    if (start_date && end_date) {
      query += ' AND attendance_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const [stats] = await db.query(query, params);
    res.json(stats[0]);
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de frequência' });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    const [report] = await db.query(`
      SELECT 
        s.id,
        s.name,
        c.name as class_name,
        COUNT(ca.id) as total_classes,
        SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN ca.status = 'absent' THEN 1 ELSE 0 END) as absent,
        ROUND((SUM(CASE WHEN ca.status = 'present' THEN 1 ELSE 0 END) / COUNT(ca.id)) * 100, 2) as attendance_rate
      FROM students s
      JOIN class_enrollments ce ON s.id = ce.student_id
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN class_attendances ca ON ca.student_id = s.id 
        AND ca.class_id = c.id
        AND YEAR(ca.attendance_date) = ?
        AND MONTH(ca.attendance_date) = ?
      WHERE ce.status = 'active'
      GROUP BY s.id, s.name, c.name
      ORDER BY s.name ASC
    `, [year, month]);

    res.json(report);
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de frequência' });
  }
};
