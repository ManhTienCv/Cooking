import { Router } from 'express';
import * as blogRepo from '../repos/blogRepo.js';
import * as blogService from '../services/blogService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const blogRouter = Router();

blogRouter.use(ensureCsrfToken);

blogRouter.get('/categories', asyncHandler(async (_req, res) => {
  const categories = await blogRepo.getCategories();
  res.json({ categories });
}));

blogRouter.get('/posts/mine', requireAuth, asyncHandler(async (req, res) => {
  const result = await blogService.getMyPosts(
    req.session.userId!,
    req.query.limit,
    req.query.offset
  );
  res.json(result);
}));

blogRouter.get('/posts/:id', asyncHandler(async (req, res) => {
  const result = await blogService.getPostDetail(req.params.id, req.session.userId ?? null);
  res.json(result);
}));

blogRouter.get('/posts', asyncHandler(async (req, res) => {
  const result = await blogService.searchPosts({
    q: req.query.q,
    category: req.query.category,
    limit: req.query.limit,
    offset: req.query.offset,
    viewerId: req.session.userId,
  });
  res.json(result);
}));

blogRouter.post('/posts', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.createPost(req.session.userId!, req.body);
  res.status(201).json({ success: true, ...result });
}));

/* ────────── Comments ────────── */

blogRouter.get('/posts/:id/comments', asyncHandler(async (req, res) => {
  const result = await blogService.getComments(req.params.id);
  res.json(result);
}));

blogRouter.post('/posts/:id/comments', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.addComment(req.params.id, req.session.userId!, req.body?.content);
  res.status(201).json({ success: true, ...result });
}));

blogRouter.put('/posts/:postId/comments/:commentId', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.updateComment(req.params.commentId, req.session.userId!, req.body?.content);
  res.json({ success: true, ...result });
}));

blogRouter.delete('/posts/:postId/comments/:commentId', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.deleteComment(req.params.commentId, req.session.userId!);
  res.json(result);
}));

/* ────────── Likes ────────── */

blogRouter.post('/posts/:id/like', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.toggleLike(req.params.id, req.session.userId!);
  res.json({ success: true, ...result });
}));

blogRouter.get('/posts/:id/like', asyncHandler(async (req, res) => {
  const result = await blogService.getLikeStatus(req.params.id, req.session.userId ?? null);
  res.json(result);
}));

/* ────────── Edit Post ────────── */

blogRouter.put('/posts/:id', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.updatePost(req.params.id, req.session.userId!, req.body);
  res.json(result);
}));

blogRouter.delete('/posts/:id', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await blogService.deletePost(req.params.id, req.session.userId!);
  res.json(result);
}));
