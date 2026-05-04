import { Router } from 'express';
import * as recipeRepo from '../repos/recipeRepo.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { processImageBase64 } from '../lib/processImage.js';

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
  const viewerId = req.session.userId ?? null;
  const [recipes, total] = await Promise.all([
    viewerId
      ? recipeRepo.searchRecipesWithViewer(search, category, viewerId, limit, offset)
      : recipeRepo.searchRecipes(search, category, limit, offset),
    viewerId
      ? recipeRepo.countSearchRecipesWithViewer(search, category, viewerId)
      : recipeRepo.countSearchRecipes(search, category),
  ]);
  res.json({ recipes, total, limit, offset });
});

recipesRouter.get('/mine', requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.getRecipesByAuthor(userId, limit, offset),
    recipeRepo.countRecipesByAuthor(userId),
  ]);
  res.json({ recipes, total, limit, offset });
});

recipesRouter.get('/saved', requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.getSavedRecipesByUser(userId, limit, offset),
    recipeRepo.countSavedRecipesByUser(userId),
  ]);
  res.json({ recipes, total, limit, offset });
});

recipesRouter.get('/categories', async (_req, res) => {
  const categories = await recipeRepo.getCategories();
  res.json({ categories });
});

recipesRouter.post('/', requireAuth, requireCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const title = String(req.body?.title ?? '').trim();
  const description = String(req.body?.description ?? '').trim() || null;
  const ingredients = String(req.body?.ingredients ?? '').trim();
  const instructions = String(req.body?.instructions ?? '').trim();
  const difficulty = String(req.body?.difficulty ?? 'Trung bình').trim() || 'Trung bình';
  const cookingTimeRaw = Number(req.body?.cooking_time);
  const servingsRaw = Number(req.body?.servings);
  const imageUrl = String(req.body?.image_url ?? '').trim() || null;
  const categoryId = Number(req.body?.category_id ?? 0);

  if (title.length < 3 || ingredients.length < 5 || instructions.length < 10 || !categoryId) {
    res.status(422).json({ success: false, message: 'Dữ liệu công thức chưa hợp lệ.' });
    return;
  }

  const finalImageUrl = processImageBase64(imageUrl || null);

  const id = await recipeRepo.createRecipe({
    title,
    description,
    ingredients,
    instructions,
    difficulty,
    cookingTime: Number.isFinite(cookingTimeRaw) && cookingTimeRaw > 0 ? cookingTimeRaw : null,
    servings: Number.isFinite(servingsRaw) && servingsRaw > 0 ? servingsRaw : null,
    imageUrl: finalImageUrl,
    categoryId,
    authorId: userId,
  });

  if (!id) {
    res.status(400).json({ success: false, message: 'Không thể tạo công thức.' });
    return;
  }

  res.status(201).json({ success: true, id, status: 'pending' });
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

recipesRouter.get('/fridge-search', async (req, res) => {
  const q = String(req.query.ingredients || '');
  const ingredients = q.split(',').map(i => i.trim()).filter(Boolean);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const { rows, total } = await recipeRepo.searchRecipesByIngredients(ingredients, limit, offset);
  res.json({ recipes: rows, total, limit, offset });
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

recipesRouter.delete('/:id', requireAuth, requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId ?? null;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const recipe = await recipeRepo.getRecipeById(id, userId);
  if (!recipe || recipe.author_id !== userId) return res.status(403).json({ error: 'Forbidden' });
  await recipeRepo.deleteRecipe(id);
  res.json({ success: true });
});
