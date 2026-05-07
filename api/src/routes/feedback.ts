import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireCsrf } from '../middleware/csrf.js';
import { feedbackSubmitRateLimit } from '../middleware/rateLimits.js';
import { sendFeedbackEmail } from '../services/mailService.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', feedbackSubmitRateLimit, requireCsrf, async (req, res) => {
  const userId = req.session.userId ?? null;
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const message = String(req.body?.message ?? '').trim();

  if (!name || !message) {
    res.status(422).json({ success: false, message: 'Vui lòng điền tên và nội dung.' });
    return;
  }

  try {
    await pool.query(
      'INSERT INTO feedback (user_id, name, email, message) VALUES ($1, $2, $3, $4)',
      [userId, name, email, message]
    );

    // Send confirmation email if email is provided
    if (email && email.includes('@')) {
      // Async so it doesn't block the response
      sendFeedbackEmail(email, name).catch(console.error);
    }

    res.json({ success: true, message: 'Đã gửi phản hồi thành công.' });
  } catch (error) {
    console.error('Feedback insert error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu phản hồi.' });
  }
});
