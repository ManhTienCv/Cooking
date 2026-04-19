import { Router } from 'express';
import * as blogRepo from '../repos/blogRepo.js';

export const blogRouter = Router();

blogRouter.get('/posts/:id', async (req, res) => {
  const id = Number(req.params.id);
  const viewerId = req.session.userId ?? null;
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const post = await blogRepo.getPostById(id, viewerId);
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ post });
});

blogRouter.get('/posts', async (req, res) => {
  const search = req.query.q ? String(req.query.q).trim() || null : null;
  const category = req.query.category ? String(req.query.category) : null;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [posts, total] = await Promise.all([
    blogRepo.searchPosts(search, category, limit, offset),
    blogRepo.countSearchPosts(search, category),
  ]);
  res.json({ posts, total, limit, offset });
});
