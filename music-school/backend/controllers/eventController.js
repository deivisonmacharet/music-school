const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { type, upcoming } = req.query;
    let query = 'SELECT * FROM events WHERE active = TRUE';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (upcoming === 'true') {
      query += ' AND event_date >= CURDATE()';
    }

    query += ' ORDER BY event_date DESC';

    const [events] = await db.query(query, params);

    // Buscar participantes para cada evento
    for (let event of events) {
      const [participants] = await db.query(`
        SELECT COUNT(*) as total
        FROM event_participants
        WHERE event_id = ?
      `, [event.id]);
      
      event.participants_count = participants[0].total;
    }

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Buscar participantes
    const [participants] = await db.query(`
      SELECT s.*, ea.status, ea.notes
      FROM event_participants ep
      JOIN students s ON ep.student_id = s.id
      LEFT JOIN event_attendances ea ON ea.event_id = ep.event_id AND ea.student_id = s.id
      WHERE ep.event_id = ?
      ORDER BY s.name ASC
    `, [req.params.id]);

    res.json({
      ...events[0],
      participants
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Erro ao buscar evento' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, event_date, location, type } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: 'Título e data do evento são obrigatórios' });
    }

    const [result] = await db.query(
      `INSERT INTO events (title, description, event_date, location, type) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, event_date, location, type]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Evento criado com sucesso'
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, event_date, location, type, active } = req.body;

    const [result] = await db.query(
      `UPDATE events SET 
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       event_date = COALESCE(?, event_date),
       location = COALESCE(?, location),
       type = COALESCE(?, type),
       active = COALESCE(?, active)
       WHERE id = ?`,
      [title, description, event_date, location, type, active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    res.json({ message: 'Evento atualizado com sucesso' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    res.json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Erro ao excluir evento' });
  }
};

exports.addParticipant = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { student_id } = req.body;
    const event_id = req.params.id;

    if (!student_id) {
      await connection.rollback();
      return res.status(400).json({ error: 'ID do aluno é obrigatório' });
    }

    // Adicionar participante
    await connection.query(
      'INSERT INTO event_participants (event_id, student_id) VALUES (?, ?)',
      [event_id, student_id]
    );

    // Criar registro de presença como confirmado
    await connection.query(
      'INSERT INTO event_attendances (event_id, student_id, status) VALUES (?, ?, ?)',
      [event_id, student_id, 'confirmed']
    );

    await connection.commit();

    res.status(201).json({ message: 'Participante adicionado com sucesso' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Aluno já está participando deste evento' });
    }
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Erro ao adicionar participante' });
  } finally {
    connection.release();
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const { studentId } = req.params;
    const eventId = req.params.id;

    const [result] = await db.query(
      'DELETE FROM event_participants WHERE event_id = ? AND student_id = ?',
      [eventId, studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    res.json({ message: 'Participante removido com sucesso' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Erro ao remover participante' });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { student_id, status, notes } = req.body;
    const event_id = req.params.id;

    if (!student_id || !status) {
      return res.status(400).json({ error: 'ID do aluno e status são obrigatórios' });
    }

    await db.query(
      `INSERT INTO event_attendances (event_id, student_id, status, notes) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = ?, notes = ?`,
      [event_id, student_id, status, notes, status, notes]
    );

    res.json({ message: 'Presença registrada com sucesso' });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Erro ao registrar presença' });
  }
};

exports.getAttendances = async (req, res) => {
  try {
    const [attendances] = await db.query(`
      SELECT ea.*, s.name as student_name
      FROM event_attendances ea
      JOIN students s ON ea.student_id = s.id
      WHERE ea.event_id = ?
      ORDER BY s.name ASC
    `, [req.params.id]);

    res.json(attendances);
  } catch (error) {
    console.error('Get attendances error:', error);
    res.status(500).json({ error: 'Erro ao buscar presenças' });
  }
};
