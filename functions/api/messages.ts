import { Hono } from 'hono';

type Bindings = {
    DB: D1Database;
};

const messages = new Hono<{ Bindings: Bindings }>();

// List messages for a chat room
messages.get('/', async (c) => {
    const db = c.env.DB;
    const roomId = c.req.query('room_id');

    if (!roomId) {
        return c.json([]);
    }

    try {
        const { results } = await db.prepare(
            `SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC`
        ).bind(roomId).all();

        return c.json(results || []);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return c.json([]);
    }
});

// Send a message
messages.post('/', async (c) => {
    const db = c.env.DB;

    try {
        const body = await c.req.json();
        const { room_id, sender_id, content } = body;

        if (!room_id || !sender_id || !content) {
            return c.json({ error: 'room_id, sender_id, and content are required' }, 400);
        }

        const id = crypto.randomUUID().replace(/-/g, '');
        await db.prepare(
            `INSERT INTO chat_messages (id, room_id, sender_id, content) VALUES (?, ?, ?, ?)`
        ).bind(id, room_id, sender_id, content).run();

        // Update last message in chat room
        await db.prepare(
            `UPDATE chat_rooms SET last_message = ?, last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(content, room_id).run();

        const newMessage = await db.prepare('SELECT * FROM chat_messages WHERE id = ?').bind(id).first();
        return c.json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        return c.json({ error: 'Failed to send message' }, 500);
    }
});

export default messages;
