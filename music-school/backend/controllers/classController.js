const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { type, active } = req.query;
    let query = `
      SELECT c.*, 
        i.name as instrument_name,
        t.name as teacher_name,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND status = 'active') as enrolled_students
      FROM classes c
      LEFT JOIN instruments i ON c.instrument_id = i.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    if (active !== undefined) {
      query += ' AND c.active = ?';
      params.push(active === 'true');
    }

    query += ' ORDER BY c.name ASC';

    const [classes] = await db.query(query, params);
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Erro ao buscar turmas' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [classes] = await db.query(`
      SELECT c.*, 
        i.name as instrument_name,
        t.name as teacher_name
      FROM classes c
      LEFT JOIN instruments i ON c.instrument_id = i.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (classes.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    // Buscar alunos matriculados
    const [students] = await db.query(`
      SELECT s.*, ce.enrollment_date, ce.status
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      WHERE ce.class_id = ?
      ORDER BY s.name ASC
    `, [req.params.id]);

    res.json({
      ...classes[0],
      students
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Erro ao buscar turma' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      name, instrument_id, teacher_id, type,
      day_of_week, start_time, end_time, max_students, monthly_fee
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO classes (name, instrument_id, teacher_id, type, day_of_week, 
       start_time, end_time, max_students, monthly_fee) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, instrument_id, teacher_id, type, day_of_week, 
       start_time, end_time, max_students, monthly_fee]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Turma criada com sucesso'
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Erro ao criar turma' });
  }
};

exports.update = async (req, res) => {
  try {
    const {
      name, instrument_id, teacher_id, type,
      day_of_week, start_time, end_time, max_students, monthly_fee, active
    } = req.body;

    const [result] = await db.query(
      `UPDATE classes SET 
       name = COALESCE(?, name),
       instrument_id = COALESCE(?, instrument_id),
       teacher_id = COALESCE(?, teacher_id),
       type = COALESCE(?, type),
       day_of_week = COALESCE(?, day_of_week),
       start_time = COALESCE(?, start_time),
       end_time = COALESCE(?, end_time),
       max_students = COALESCE(?, max_students),
       monthly_fee = COALESCE(?, monthly_fee),
       active = COALESCE(?, active)
       WHERE id = ?`,
      [name, instrument_id, teacher_id, type, day_of_week, 
       start_time, end_time, max_students, monthly_fee, active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    res.json({ message: 'Turma atualizada com sucesso' });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Erro ao atualizar turma' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM classes WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    res.json({ message: 'Turma excluída com sucesso' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Erro ao excluir turma' });
  }
};

exports.enrollStudent = async (req, res) => {
  try {
    const { student_id, enrollment_date } = req.body;
    const class_id = req.params.id;

    if (!student_id) {
      return res.status(400).json({ error: 'ID do aluno é obrigatório' });
    }

    // Verificar vagas disponíveis
    const [classInfo] = await db.query(`
      SELECT max_students,
        (SELECT COUNT(*) FROM class_enrollments WHERE class_id = ? AND status = 'active') as enrolled
      FROM classes WHERE id = ?
    `, [class_id, class_id]);

    if (classInfo.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    if (classInfo[0].enrolled >= classInfo[0].max_students) {
      return res.status(400).json({ error: 'Turma está com vagas esgotadas' });
    }

    const [result] = await db.query(
      'INSERT INTO class_enrollments (student_id, class_id, enrollment_date, status) VALUES (?, ?, ?, ?)',
      [student_id, class_id, enrollment_date || new Date(), 'active']
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Aluno matriculado com sucesso'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Aluno já está matriculado nesta turma' });
    }
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Erro ao matricular aluno' });
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const classId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM class_enrollments WHERE class_id = ? AND student_id = ?',
      [classId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Matrícula não encontrada' });
    }

    res.json({ message: 'Aluno removido da turma com sucesso' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Erro ao remover aluno' });
  }
};
