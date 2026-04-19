import { Router } from 'express';
import * as recipeRepo from '../repos/recipeRepo.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/csrf.js';

export const recipesRouter = Router();

recipesRouter.get('/featured', async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 6));
  const rows = await recipeRepo.getFeaturedRecipes(limit);
  res.json({ recipes: rows });
});

recipesRouter.get('/search', async (req, res) => {
  const search = req.query.q ? String(req.query.q).trim() || null : null;
  const category = req.query.category ? String(req.query.category) : null;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.searchRecipes(search, category, limit, offset),
    recipeRepo.countSearchRecipes(search, category),
  ]);
  res.json({ recipes, total, limit, offset });
});

recipesRouter.get('/categories', async (_req, res) => {
  const categories = await recipeRepo.getCategories();
  res.json({ categories });
});

recipesRouter.post('/toggle-save', requireAuth, requireCsrf, async (req, res) => {
  const recipeId = Number(req.body?.id ?? req.query.id);
  const userId = req.session.userId!;
  if (!recipeId) {
    res.status(400).json({ error: 'Invalid recipe ID' });
    return;
  }
  try {
    const saved = await recipeRepo.toggleSave(userId, recipeId);
    res.json({ saved });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Lỗi hệ thống. Vui lòng thử lại sau.' });
  }
});

recipesRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const viewerId = req.session.userId ?? null;
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const recipe = await recipeRepo.getRecipeById(id, viewerId);
  if (!recipe) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  let isSaved = false;
  if (viewerId) {
    isSaved = await recipeRepo.isSaved(viewerId, id);
  }
  res.json({ recipe, isSaved });
});

recipesRouter.post('/:id/view', requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId ?? null;
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const incremented = await recipeRepo.incrementViews(id, userId);
  res.json({ ok: true, incremented });
});
