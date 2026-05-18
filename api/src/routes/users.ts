import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as publicProfileService from '../services/publicProfileService.js';

export const usersRouter = Router();

usersRouter.get('/:id/public', asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid user ID.' });
    return;
  }
  const viewerId = req.session.userId ?? null;
  const result = await publicProfileService.getPublicProfile(userId, viewerId);
  res.json({ success: true, ...result });
}));

usersRouter.get('/:id/products', asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid user ID.' });
    return;
  }
  const result = await publicProfileService.getPublicProducts(
    userId,
    req.query.limit,
    req.query.offset
  );
  res.json({ success: true, ...result });
}));

usersRouter.get('/:id/recipes', asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid user ID.' });
    return;
  }
  const result = await publicProfileService.getPublicRecipes(
    userId,
    req.query.limit,
    req.query.offset
  );
  res.json({ success: true, ...result });
}));

usersRouter.get('/:id/posts', asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    res.status(400).json({ success: false, message: 'Invalid user ID.' });
    return;
  }
  const result = await publicProfileService.getPublicPosts(
    userId,
    req.query.limit,
    req.query.offset
  );
  res.json({ success: true, ...result });
}));

usersRouter.post('/:id/follow', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  if (!targetId) {
    res.status(400).json({ success: false, message: 'Invalid user ID.' });
    return;
  }
  const result = await publicProfileService.toggleFollow(req.session.userId!, targetId);
  res.json({ success: true, ...result });
}));
