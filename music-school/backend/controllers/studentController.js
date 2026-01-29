const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { active, search } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true');
    }

    if (search) {
      query += ' AND (name LIKE ? OR cpf LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const [students] = await db.query(query, params);
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Buscar turmas do aluno
    const [classes] = await db.query(`
      SELECT c.*, i.name as instrument_name, ce.enrollment_date, ce.status
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN instruments i ON c.instrument_id = i.id
      WHERE ce.student_id = ?
    `, [req.params.id]);

    // Buscar pagamentos pendentes
    const [pendingPayments] = await db.query(`
      SELECT * FROM payments 
      WHERE student_id = ? AND status = 'pending'
      ORDER BY due_date ASC
    `, [req.params.id]);

    res.json({
      ...students[0],
      classes,
      pendingPayments
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Erro ao buscar aluno' });
  }
};

exports.create = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      name, cpf, phone, birth_date, address,
      responsible_name, responsible_phone, enrollment_date,
      email, password
    } = req.body;

    // Validação básica
    if (!name || !cpf || !enrollment_date) {
      await connection.rollback();
      return res.status(400).json({ error: 'Nome, CPF e data de matrícula são obrigatórios' });
    }

    // Verificar se CPF já existe
    const [existingStudent] = await connection.query(
      'SELECT id FROM students WHERE cpf = ?',
      [cpf]
    );

    if (existingStudent.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    let userId = null;

    // Criar usuário se email e senha foram fornecidos
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
        [email, hashedPassword, 'student']
      );
      userId = userResult.insertId;
    }

    // Inserir aluno
    const [result] = await connection.query(
      `INSERT INTO students (user_id, name, cpf, phone, birth_date, address, 
       responsible_name, responsible_phone, enrollment_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, cpf, phone, birth_date, address, 
       responsible_name, responsible_phone, enrollment_date]
    );

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      message: 'Aluno cadastrado com sucesso'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar aluno' });
  } finally {
    connection.release();
  }
};

exports.update = async (req, res) => {
  try {
    const {
      name, cpf, phone, birth_date, address,
      responsible_name, responsible_phone, active
    } = req.body;

    const [result] = await db.query(
      `UPDATE students SET 
       name = COALESCE(?, name),
       cpf = COALESCE(?, cpf),
       phone = COALESCE(?, phone),
       birth_date = COALESCE(?, birth_date),
       address = COALESCE(?, address),
       responsible_name = COALESCE(?, responsible_name),
       responsible_phone = COALESCE(?, responsible_phone),
       active = COALESCE(?, active)
       WHERE id = ?`,
      [name, cpf, phone, birth_date, address, 
       responsible_name, responsible_phone, active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json({ message: 'Aluno atualizado com sucesso' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json({ message: 'Aluno excluído com sucesso' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Erro ao excluir aluno' });
  }
};
