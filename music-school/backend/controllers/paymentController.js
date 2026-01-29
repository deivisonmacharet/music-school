const db = require('../config/database');
const moment = require('moment');

exports.getAll = async (req, res) => {
  try {
    const { status, student_id, month, year } = req.query;
    let query = `
      SELECT p.*, s.name as student_name, s.cpf
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (student_id) {
      query += ' AND p.student_id = ?';
      params.push(student_id);
    }

    if (month && year) {
      query += ' AND YEAR(p.reference_month) = ? AND MONTH(p.reference_month) = ?';
      params.push(year, month);
    }

    query += ' ORDER BY p.due_date DESC';

    const [payments] = await db.query(query, params);
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, s.name as student_name, s.cpf, s.phone
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json(payments[0]);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento' });
  }
};

exports.create = async (req, res) => {
  try {
    const { student_id, amount, due_date, reference_month } = req.body;

    if (!student_id || !amount || !due_date || !reference_month) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const [result] = await db.query(
      `INSERT INTO payments (student_id, amount, due_date, reference_month, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [student_id, amount, due_date, reference_month]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Pagamento criado com sucesso'
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
};

exports.update = async (req, res) => {
  try {
    const { amount, due_date, status, payment_date, payment_method, notes } = req.body;

    const [result] = await db.query(
      `UPDATE payments SET 
       amount = COALESCE(?, amount),
       due_date = COALESCE(?, due_date),
       status = COALESCE(?, status),
       payment_date = COALESCE(?, payment_date),
       payment_method = COALESCE(?, payment_method),
       notes = COALESCE(?, notes)
       WHERE id = ?`,
      [amount, due_date, status, payment_date, payment_method, notes, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json({ message: 'Pagamento atualizado com sucesso' });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
};

exports.markAsPaid = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { payment_method, payment_date, notes } = req.body;
    const paymentId = req.params.id;

    // Buscar informações do pagamento
    const [payments] = await connection.query(`
      SELECT p.*, s.name as student_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.id = ?
    `, [paymentId]);

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = payments[0];

    // Gerar número do recibo
    const receiptNumber = `REC-${moment().format('YYYYMMDD')}-${paymentId}`;

    // Atualizar pagamento
    await connection.query(
      `UPDATE payments SET 
       status = 'paid',
       payment_date = ?,
       payment_method = ?,
       receipt_number = ?,
       notes = ?
       WHERE id = ?`,
      [payment_date || new Date(), payment_method, receiptNumber, notes, paymentId]
    );

    // Criar recibo
    await connection.query(
      `INSERT INTO receipts (payment_id, receipt_number, issue_date, student_name, amount, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        receiptNumber,
        new Date(),
        payment.student_name,
        payment.amount,
        `Pagamento referente a ${moment(payment.reference_month).format('MMMM/YYYY')}`
      ]
    );

    await connection.commit();

    res.json({
      message: 'Pagamento confirmado com sucesso',
      receiptNumber
    });
  } catch (error) {
    await connection.rollback();
    console.error('Mark as paid error:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  } finally {
    connection.release();
  }
};

exports.getOverdue = async (req, res) => {
  try {
    const [payments] = await db.query(`
      SELECT p.*, s.name as student_name, s.phone, s.cpf
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.status = 'pending' AND p.due_date < CURDATE()
      ORDER BY p.due_date ASC
    `);

    res.json(payments);
  } catch (error) {
    console.error('Get overdue error:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamentos atrasados' });
  }
};

exports.generateMonthlyPayments = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { reference_month, due_day } = req.body;

    if (!reference_month || !due_day) {
      await connection.rollback();
      return res.status(400).json({ error: 'Mês de referência e dia de vencimento são obrigatórios' });
    }

    // Buscar todas as matrículas ativas
    const [enrollments] = await connection.query(`
      SELECT DISTINCT ce.student_id, c.monthly_fee
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      WHERE ce.status = 'active' AND c.active = TRUE
    `);

    if (enrollments.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Nenhuma matrícula ativa encontrada' });
    }

    const refMonth = moment(reference_month);
    const dueDate = refMonth.clone().date(due_day);

    let created = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
      // Verificar se já existe pagamento para este mês
      const [existing] = await connection.query(
        `SELECT id FROM payments 
         WHERE student_id = ? AND reference_month = ?`,
        [enrollment.student_id, reference_month]
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO payments (student_id, amount, due_date, reference_month, status) 
           VALUES (?, ?, ?, ?, 'pending')`,
          [enrollment.student_id, enrollment.monthly_fee, dueDate.format('YYYY-MM-DD'), reference_month]
        );
        created++;
      } else {
        skipped++;
      }
    }

    await connection.commit();

    res.json({
      message: `Pagamentos gerados com sucesso`,
      created,
      skipped
    });
  } catch (error) {
    await connection.rollback();
    console.error('Generate monthly payments error:', error);
    res.status(500).json({ error: 'Erro ao gerar pagamentos mensais' });
  } finally {
    connection.release();
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const [receipts] = await db.query(`
      SELECT r.*, p.payment_method, p.payment_date
      FROM receipts r
      JOIN payments p ON r.payment_id = p.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (receipts.length === 0) {
      return res.status(404).json({ error: 'Recibo não encontrado' });
    }

    res.json(receipts[0]);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Erro ao buscar recibo' });
  }
};
