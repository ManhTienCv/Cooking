import { pool } from '../db/pool.js';

export const feedbackRepo = {
  async createFeedback(userId: number | null, name: string, email: string, message: string) {
    await pool.query(
      'INSERT INTO feedback (user_id, name, email, message) VALUES ($1, $2, $3, $4)',
      [userId, name, email, message]
    );
  }
};
