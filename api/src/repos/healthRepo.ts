import type { Pool } from 'pg';

export interface PlanMealRecipeInput {
  id: string;
  name: string;
  note: string;
  isCustom: boolean;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number };
}

type DbRow = Record<string, unknown>;

export async function createPlan(pool: Pool, userId: number, data: Record<string, unknown>): Promise<number | null> {
  const r = await pool.query(
    `INSERT INTO health_plans (user_id, name, description, start_date, end_date, diet_type, meal_count, target_calories)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      userId,
      data.name,
      data.description,
      data.start_date,
      data.end_date,
      data.diet_type,
      data.meal_count ?? 0,
      Number(data.target_calories ?? 0),
    ]
  );
  return Number(r.rows[0]?.id ?? 0) || null;
}

export async function getUserPlans(pool: Pool, userId: number): Promise<DbRow[]> {
  const r = await pool.query('SELECT * FROM health_plans WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return r.rows;
}

export async function getPlanById(pool: Pool, planId: number, userId: number): Promise<DbRow | null> {
  const r = await pool.query('SELECT * FROM health_plans WHERE id = $1 AND user_id = $2', [planId, userId]);
  return r.rows[0] ?? null;
}

export async function deletePlan(pool: Pool, planId: number, userId: number): Promise<boolean> {
  const r = await pool.query('DELETE FROM health_plans WHERE id = $1 AND user_id = $2', [planId, userId]);
  return (r.rowCount ?? 0) > 0;
}

export async function addMeal(pool: Pool, planId: number, date: string, mealType: string, recipe: PlanMealRecipeInput): Promise<boolean> {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const nutritionJson = recipe.nutrition ? JSON.stringify(recipe.nutrition) : null;
    await conn.query(
      `INSERT INTO plan_meals (plan_id, date, meal_type, recipe_id, recipe_name, note, is_custom, nutrition_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [planId, date, mealType, String(recipe.id), recipe.name, recipe.note, recipe.isCustom, nutritionJson]
    );
    await conn.query('UPDATE health_plans SET meal_count = meal_count + 1 WHERE id = $1', [planId]);
    await conn.query('COMMIT');
    return true;
  } catch {
    await conn.query('ROLLBACK');
    return false;
  } finally {
    conn.release();
  }
}

export async function getPlanMeals(pool: Pool, planId: number): Promise<Record<string, { breakfast: unknown[]; lunch: unknown[]; dinner: unknown[] }>> {
  const r = await pool.query('SELECT * FROM plan_meals WHERE plan_id = $1 ORDER BY date, meal_type', [planId]);
  const meals: Record<string, { breakfast: unknown[]; lunch: unknown[]; dinner: unknown[] }> = {};

  for (const row of r.rows as DbRow[]) {
    const date = String(row.date);
    const type = String(row.meal_type);
    if (!meals[date]) meals[date] = { breakfast: [], lunch: [], dinner: [] };
    const slot = meals[date] as Record<string, unknown[]>;
    const item = {
      id: row.id,
      recipe_id: row.recipe_id,
      name: row.recipe_name,
      note: row.note,
      isCustom: Boolean(row.is_custom),
      nutrition: row.nutrition_info ?? null,
    };
    if (type in slot) slot[type].push(item);
  }
  return meals;
}

export async function removeMeal(pool: Pool, mealId: number, planId: number): Promise<boolean> {
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const r = await conn.query('DELETE FROM plan_meals WHERE id = $1 AND plan_id = $2', [mealId, planId]);
    if ((r.rowCount ?? 0) > 0) {
      await conn.query('UPDATE health_plans SET meal_count = GREATEST(meal_count - 1, 0) WHERE id = $1', [planId]);
      await conn.query('COMMIT');
      return true;
    }
    await conn.query('ROLLBACK');
    return false;
  } catch {
    await conn.query('ROLLBACK');
    return false;
  } finally {
    conn.release();
  }
}

export async function addShoppingItem(pool: Pool, planId: number, name: string, quantity: string): Promise<boolean> {
  const r = await pool.query('INSERT INTO shopping_items (plan_id, name, quantity) VALUES ($1,$2,$3)', [planId, name, quantity]);
  return (r.rowCount ?? 0) > 0;
}

export async function getShoppingList(pool: Pool, planId: number): Promise<{ id: number; name: string; quantity: string; checked: boolean }[]> {
  const r = await pool.query('SELECT * FROM shopping_items WHERE plan_id = $1 ORDER BY created_at DESC', [planId]);
  return r.rows.map((row: DbRow) => ({
    id: Number(row.id),
    name: String(row.name),
    quantity: String(row.quantity ?? ''),
    checked: Boolean(row.is_checked),
  }));
}

export async function toggleShoppingItem(pool: Pool, itemId: number, planId: number): Promise<boolean> {
  const r = await pool.query('UPDATE shopping_items SET is_checked = NOT is_checked WHERE id = $1 AND plan_id = $2', [itemId, planId]);
  return (r.rowCount ?? 0) > 0;
}

export async function removeShoppingItem(pool: Pool, itemId: number, planId: number): Promise<boolean> {
  const r = await pool.query('DELETE FROM shopping_items WHERE id = $1 AND plan_id = $2', [itemId, planId]);
  return (r.rowCount ?? 0) > 0;
}

export function getNutritionTotalsFromMeals(
  meals: Record<string, { breakfast: unknown[]; lunch: unknown[]; dinner: unknown[] }>
): { calories: number; protein: number; carbs: number; fat: number } {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let daysWithMeals = 0;

  for (const date of Object.keys(meals)) {
    const dayMeals = meals[date];
    let hasMeals = false;
    for (const type of ['breakfast', 'lunch', 'dinner'] as const) {
      const recipes = dayMeals[type] as { nutrition?: { calories: number; protein: number; carbs: number; fat: number } }[];
      if (recipes?.length) hasMeals = true;
      for (const recipe of recipes ?? []) {
        if (recipe?.nutrition) {
          totals.calories += recipe.nutrition.calories;
          totals.protein += recipe.nutrition.protein;
          totals.carbs += recipe.nutrition.carbs;
          totals.fat += recipe.nutrition.fat;
        }
      }
    }
    if (hasMeals) daysWithMeals++;
  }

  if (daysWithMeals > 0) {
    totals.calories = Math.round(totals.calories / daysWithMeals);
    totals.protein = Math.round(totals.protein / daysWithMeals);
    totals.carbs = Math.round(totals.carbs / daysWithMeals);
    totals.fat = Math.round(totals.fat / daysWithMeals);
  }
  return totals;
}
