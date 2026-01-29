const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM teachers WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    query += ' ORDER BY name ASC';

    const [teachers] = await db.query(query, params);
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Erro ao buscar professores' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [teachers] = await db.query('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
    
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }

    // Buscar turmas do professor
    const [classes] = await db.query(`
      SELECT c.*, i.name as instrument_name,
      (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id AND status = 'active') as enrolled_students
      FROM classes c
      LEFT JOIN instruments i ON c.instrument_id = i.id
      WHERE c.teacher_id = ?
    `, [req.params.id]);

    res.json({
      ...teachers[0],
      classes
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ error: 'Erro ao buscar professor' });
  }
};

exports.create = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      name, cpf, phone, birth_date, address,
      specialty, hire_date, email, password
    } = req.body;

    if (!name || !cpf) {
      await connection.rollback();
      return res.status(400).json({ error: 'Nome e CPF são obrigatórios' });
    }

    const [existingTeacher] = await connection.query(
      'SELECT id FROM teachers WHERE cpf = ?',
      [cpf]
    );

    if (existingTeacher.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    let userId = null;

    if (email && password) {
      const [existingUser] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, 'employee']
      );
      userId = userResult.insertId;
    }

    const [result] = await connection.query(
      `INSERT INTO teachers (user_id, name, cpf, phone, birth_date, address, specialty, hire_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, cpf, phone, birth_date, address, specialty, hire_date]
    );

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      message: 'Professor cadastrado com sucesso'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create teacher error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar professor' });
  } finally {
    connection.release();
  }
};

exports.update = async (req, res) => {
  try {
    const {
      name, cpf, phone, birth_date, address, specialty, active
    } = req.body;

    const [result] = await db.query(
      `UPDATE teachers SET 
       name = COALESCE(?, name),
       cpf = COALESCE(?, cpf),
       phone = COALESCE(?, phone),
       birth_date = COALESCE(?, birth_date),
       address = COALESCE(?, address),
       specialty = COALESCE(?, specialty),
       active = COALESCE(?, active)
       WHERE id = ?`,
      [name, cpf, phone, birth_date, address, specialty, active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }

    res.json({ message: 'Professor atualizado com sucesso' });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ error: 'Erro ao atualizar professor' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Professor não encontrado' });
    }

    res.json({ message: 'Professor excluído com sucesso' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Erro ao excluir professor' });
  }
};
