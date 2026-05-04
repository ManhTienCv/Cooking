import { Router } from 'express';
import * as healthRepo from '../repos/healthRepo.js';
import { MealPlanHandler } from '../services/mealPlanHandler.js';
import { generateContent } from '../services/aiService.js';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';

export const healthRouter = Router();

healthRouter.use(ensureCsrfToken);

function normalizePositiveNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function fallbackCalories(input: {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goal: string;
}): number {
  const isMale = input.gender === 'male';
  const bmr = isMale
    ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
    : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;

  const activityMap: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (activityMap[input.activityLevel] ?? 1.375);

  const goalDelta: Record<string, number> = {
    lose: -400,
    maintain: 0,
    gain: 350,
  };
  const adjusted = tdee + (goalDelta[input.goal] ?? 0);
  return Math.max(1000, Math.min(6000, Math.round(adjusted)));
}

healthRouter.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const stats = await healthRepo.getNutritionDashboardStats(pool, req.session.userId!);
    res.json({ success: true, stats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu dashboard.' });
  }
});

healthRouter.post('/ai/calorie-target', requireAuth, requireCsrf, async (req, res) => {
  const age = normalizePositiveNumber(req.body?.age);
  const heightCm = normalizePositiveNumber(req.body?.height_cm);
  const weightKg = normalizePositiveNumber(req.body?.weight_kg);
  const gender = String(req.body?.gender ?? '').trim().toLowerCase();
  const activityLevel = String(req.body?.activity_level ?? '').trim().toLowerCase();
  const goal = String(req.body?.goal ?? '').trim().toLowerCase();
  const dietType = String(req.body?.diet_type ?? '').trim();

  if (!age || !heightCm || !weightKg || !gender || !activityLevel || !goal) {
    res.status(422).json({ success: false, message: 'Thiếu dữ liệu để tính calo.' });
    return;
  }

  const fallback = fallbackCalories({
    gender,
    age,
    heightCm,
    weightKg,
    activityLevel,
    goal,
  });

  const prompt = [
    'Bạn là chuyên gia dinh dưỡng. Trả về JSON thuần, không markdown.',
    'Nhiệm vụ: gợi ý mức kcal/ngày hợp lý, an toàn.',
    'JSON schema bắt buộc:',
    '{"target_calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "notes": string}',
    `Input: age=${age}, height_cm=${heightCm}, weight_kg=${weightKg}, gender=${gender}, activity=${activityLevel}, goal=${goal}, diet_type=${dietType || 'Cân bằng'}`,
    'Ràng buộc: target_calories từ 1000 đến 6000.',
  ].join('\n');

  let aiResult: Record<string, unknown> | null = null;
  try {
    const parsed = await generateContent(prompt, true);
    if (parsed && !Array.isArray(parsed)) {
      aiResult = parsed as Record<string, unknown>;
    }
  } catch {
    aiResult = null;
  }

  const aiTarget = normalizePositiveNumber(aiResult?.target_calories);
  const targetCalories = aiTarget ? Math.max(1000, Math.min(6000, Math.round(aiTarget))) : fallback;

  res.json({
    success: true,
    data: {
      target_calories: targetCalories,
      protein_g: Number(aiResult?.protein_g ?? 0) || 0,
      carbs_g: Number(aiResult?.carbs_g ?? 0) || 0,
      fat_g: Number(aiResult?.fat_g ?? 0) || 0,
      notes: String(aiResult?.notes ?? 'Gợi ý kcal được tính từ chỉ số cơ thể và mục tiêu.'),
      source: aiTarget ? 'gemini' : 'fallback',
    },
  });
});

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
  const body = req.body ?? {} as Record<string, unknown>;
  const id = await healthRepo.createPlan(pool, userId, body);
  if (!id) {
    res.status(400).json({ success: false, message: 'Không thể tạo kế hoạch.' });
    return;
  }

  // Auto-generate meals with AI if target_calories is set
  const targetCalories = Number(body.target_calories ?? 0);
  let aiMessage = '';
  if (targetCalories >= 1000) {
    const startDate = String(body.start_date ?? '');
    const endDate = String(body.end_date ?? '');
    const dietType = String(body.diet_type ?? 'Cân bằng');
    const dayCount = Math.max(1, Math.min(14,
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
    ));

    const handler = new MealPlanHandler(pool, userId, id);
    const result = await handler.autoGenerateMeals(startDate, dayCount, targetCalories, dietType);
    aiMessage = result.message;
  }

  res.json({ success: true, id, aiMessage });
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
        const mealPlan = await handler.getMealPlan();
        res.json({
          success: true,
          mealPlan,
          nutritionTotals: healthRepo.getNutritionTotalsFromMeals(mealPlan),
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
