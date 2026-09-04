import { Router } from 'express';
import * as recipeRepo from '../repos/recipeRepo.js';
import * as recipeService from '../services/recipeService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const recipesRouter = Router();

recipesRouter.get('/featured', asyncHandler(async (req, res) => {
  const result = await recipeService.getFeaturedRecipes(req.query.limit);
  res.json(result);
}));

recipesRouter.get('/search', asyncHandler(async (req, res) => {
  const result = await recipeService.searchRecipes({
    q: req.query.q,
    category: req.query.category,
    limit: req.query.limit,
    offset: req.query.offset,
    viewerId: req.session.userId,
  });
  res.json(result);
}));

recipesRouter.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const result = await recipeService.getMyRecipes(
    req.session.userId!,
    req.query.limit,
    req.query.offset
  );
  res.json(result);
}));

recipesRouter.get('/saved', requireAuth, asyncHandler(async (req, res) => {
  const result = await recipeService.getSavedRecipes(
    req.session.userId!,
    req.query.limit,
    req.query.offset
  );
  res.json(result);
}));

recipesRouter.get('/categories', asyncHandler(async (_req, res) => {
  const categories = await recipeRepo.getCategories();
  res.json({ categories });
}));

recipesRouter.post('/', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.createRecipe(req.session.userId!, req.body);
  res.status(201).json({ success: true, ...result });
}));

recipesRouter.post('/toggle-save', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const recipeId = req.body?.id ?? req.query.id;
  const result = await recipeService.toggleSaveRecipe(req.session.userId!, recipeId);
  res.json(result);
}));

recipesRouter.get('/fridge-search', asyncHandler(async (req, res) => {
  const result = await recipeService.fridgeSearch(
    req.query.ingredients,
    req.query.limit,
    req.query.offset
  );
  res.json(result);
}));

recipesRouter.get('/:id', asyncHandler(async (req, res) => {
  const result = await recipeService.getRecipeDetail(req.params.id, req.session.userId ?? null);
  res.json(result);
}));

recipesRouter.post('/:id/view', requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.incrementRecipeViews(req.params.id, req.session.userId ?? null);
  res.json({ ok: true, ...result });
}));

recipesRouter.put('/:id', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.updateRecipe(req.params.id, req.session.userId!, req.body);
  res.json(result);
}));

recipesRouter.delete('/:id', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.deleteRecipe(req.params.id, req.session.userId!);
  res.json(result);
}));

/* ================================================================
 * Recipe Tagged Products (Gắn đồ bếp / nguyên liệu)
 * ================================================================ */

recipesRouter.get('/:id/tagged-products', asyncHandler(async (req, res) => {
  const result = await recipeService.getRecipeTaggedProducts(req.params.id);
  res.json({ success: true, ...result });
}));

recipesRouter.post('/:id/tagged-products', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.addRecipeTaggedProduct(
    req.params.id,
    req.session.userId!,
    req.body?.product_id,
    req.body?.usage_note
  );
  res.json(result);
}));

recipesRouter.delete('/:id/tagged-products/:productId', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await recipeService.removeRecipeTaggedProduct(
    req.params.id,
    req.session.userId!,
    req.params.productId
  );
  res.json(result);
}));

