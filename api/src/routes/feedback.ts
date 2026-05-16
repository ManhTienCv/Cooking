import { Router } from 'express';
import { requireCsrf } from '../middleware/csrf.js';
import { feedbackSubmitRateLimit } from '../middleware/rateLimits.js';
import { sendFeedbackEmail } from '../services/mailService.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { feedbackRepo } from '../repos/feedbackRepo.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', feedbackSubmitRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const userId = req.session.userId ?? null;
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const message = String(req.body?.message ?? '').trim();

  if (!name || !message) {
    res.status(422).json({ success: false, message: 'Vui lòng điền tên và nội dung.' });
    return;
  }

  await feedbackRepo.createFeedback(userId, name, email, message);

  // Send confirmation email if email is provided
  if (email && email.includes('@')) {
    // Async so it doesn't block the response
    sendFeedbackEmail(email, name).catch(console.error);
  }

  res.json({ success: true, message: 'Đã gửi phản hồi thành công.' });
}));
