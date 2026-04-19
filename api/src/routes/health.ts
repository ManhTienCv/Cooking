import { Router } from 'express';
import * as healthRepo from '../repos/healthRepo.js';
import { MealPlanHandler } from '../services/mealPlanHandler.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';

export const healthRouter = Router();

healthRouter.use(ensureCsrfToken);

healthRouter.get('/plans', requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const plans = await healthRepo.getUserPlans(pool, userId);
  res.json({ plans });
});

healthRouter.get('/plans/:id', requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const planId = Number(req.params.id);
  if (!planId) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const plan = await healthRepo.getPlanById(pool, planId, userId);
  if (!plan) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json({ plan });
});

healthRouter.post('/plans', requireAuth, requireCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const id = await healthRepo.createPlan(pool, userId, req.body ?? {});
  if (!id) {
    res.status(400).json({ success: false, message: 'Không thể tạo kế hoạch.' });
    return;
  }
  res.json({ success: true, id });
});

healthRouter.delete('/plans/:id', requireAuth, requireCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const planId = Number(req.params.id);
  const ok = await healthRepo.deletePlan(pool, planId, userId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Không tìm thấy kế hoạch.' });
    return;
  }
  res.json({ success: true });
});

/** Compatible with PHP meal_plan_api.php (POST + action + csrf_token in body) */
healthRouter.post('/meal-plan', requireAuth, requireCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const body = req.body as Record<string, unknown>;
  const action = String(body.action ?? '');
  const planId = Number(body.plan_id ?? 0);

  if (!planId) {
    res.json({ success: false, message: 'Thiếu plan_id.' });
    return;
  }

  const plan = await healthRepo.getPlanById(pool, planId, userId);
  if (!plan) {
    res.json({ success: false, message: 'Kế hoạch không tồn tại.' });
    return;
  }

  const handler = new MealPlanHandler(pool, userId, planId);

  try {
    switch (action) {
      case 'add_recipe': {
        const date = String(body.date ?? '');
        const mealType = String(body.meal_type ?? '');
        const recipe = {
          id: String(body.recipe_id ?? ''),
          name: String(body.recipe_name ?? ''),
          note: String(body.recipe_note ?? ''),
          isCustom: body.is_custom === true || body.is_custom === 'true' || body.is_custom === '1',
        };
        const result = await handler.addRecipe(date, mealType, recipe);
        res.json(result);
        return;
      }
      case 'remove_recipe': {
        const date = String(body.date ?? '');
        const mealType = String(body.meal_type ?? '');
        const idMeal = Number(body.id ?? 0);
        const result = await handler.removeRecipe(date, mealType, idMeal);
        res.json(result);
        return;
      }
      case 'add_shopping_item': {
        const name = String(body.name ?? '');
        const quantity = String(body.quantity ?? '');
        const result = await handler.addShoppingItem(name, quantity);
        res.json(result);
        return;
      }
      case 'toggle_shopping_item': {
        const itemId = Number(body.item_id ?? 0);
        const result = await handler.toggleShoppingItem(itemId);
        res.json(result);
        return;
      }
      case 'remove_shopping_item': {
        const itemId = Number(body.item_id ?? 0);
        const result = await handler.removeShoppingItem(itemId);
        res.json(result);
        return;
      }
      case 'get_meal_plan': {
        res.json({
          success: true,
          mealPlan: await handler.getMealPlan(),
        });
        return;
      }
      case 'get_shopping_list': {
        res.json({
          success: true,
          shoppingList: await handler.getShoppingList(),
        });
        return;
      }
      default:
        res.json({ success: false, message: 'Action không hợp lệ!' });
    }
  } catch (e) {
    console.error(e);
    res.json({
      success: false,
      message: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
    });
  }
});
