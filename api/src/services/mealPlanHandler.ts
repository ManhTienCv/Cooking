import type { Pool } from 'pg';
import * as healthRepo from '../repos/healthRepo.js';
import type { PlanMealRecipeInput } from '../repos/healthRepo.js';
import { generateContent } from './aiService.js';

export class MealPlanHandler {
  constructor(
    private readonly pool: Pool,
    _userId: number,
    private readonly planId: number
  ) {}

  async getMealPlan(): Promise<Record<string, { breakfast: unknown[]; lunch: unknown[]; dinner: unknown[] }>> {
    return healthRepo.getPlanMeals(this.pool, this.planId);
  }

  async addRecipe(date: string, mealType: string, recipe: PlanMealRecipeInput): Promise<{
    success: boolean;
    message: string;
    mealPlan?: unknown[];
    nutritionTotals?: { calories: number; protein: number; carbs: number; fat: number };
  }> {
    const withNutrition = { ...recipe, nutrition: await this.estimateNutrition(recipe.name) };
    const ok = await healthRepo.addMeal(this.pool, this.planId, date, mealType, withNutrition);
    if (!ok) return { success: false, message: 'Failed to save meal into database.' };

    const mealPlan = await this.getMealPlan();
    const day = mealPlan[date]?.[mealType as 'breakfast' | 'lunch' | 'dinner'] ?? [];
    return {
      success: true,
      message: `Added ${recipe.name} to plan.`,
      mealPlan: day,
      nutritionTotals: healthRepo.getNutritionTotalsFromMeals(mealPlan),
    };
  }

  async removeRecipe(
    date: string,
    mealType: string,
    mealId: number
  ): Promise<{
    success: boolean;
    message: string;
    mealPlan?: unknown[];
    nutritionTotals?: { calories: number; protein: number; carbs: number; fat: number };
  }> {
    const ok = await healthRepo.removeMeal(this.pool, mealId, this.planId);
    if (!ok) return { success: false, message: 'Meal not found or remove failed.' };

    const mealPlan = await this.getMealPlan();
    const day = mealPlan[date]?.[mealType as 'breakfast' | 'lunch' | 'dinner'] ?? [];
    return {
      success: true,
      message: 'Meal removed.',
      mealPlan: day,
      nutritionTotals: healthRepo.getNutritionTotalsFromMeals(mealPlan),
    };
  }

  getShoppingList(): Promise<{ id: number; name: string; quantity: string; checked: boolean }[]> {
    return healthRepo.getShoppingList(this.pool, this.planId);
  }

  async addShoppingItem(name: string, quantity = ''): Promise<{
    success: boolean;
    message: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const n = name.trim();
    if (!n) return { success: false, message: 'Name is required.' };
    const ok = await healthRepo.addShoppingItem(this.pool, this.planId, n, quantity.trim());
    if (!ok) return { success: false, message: 'Failed to save shopping item.' };
    return { success: true, message: `Added ${n}.`, shoppingList: await this.getShoppingList() };
  }

  async toggleShoppingItem(itemId: number): Promise<{
    success: boolean;
    message?: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const ok = await healthRepo.toggleShoppingItem(this.pool, itemId, this.planId);
    if (!ok) return { success: false, message: 'Update failed.' };
    return { success: true, shoppingList: await this.getShoppingList() };
  }

  async removeShoppingItem(itemId: number): Promise<{
    success: boolean;
    message: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const ok = await healthRepo.removeShoppingItem(this.pool, itemId, this.planId);
    if (!ok) return { success: false, message: 'Delete failed.' };
    return { success: true, message: 'Deleted.', shoppingList: await this.getShoppingList() };
  }

  private async estimateNutrition(recipeName: string): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    const prompt = `Estimate nutritional values for 1 serving of the dish '${recipeName}'. Return ONLY a JSON object with these integer keys: calories, protein, carbs, fat. Do not include markdown formatting or explanations.`;
    const apiResult = await generateContent(prompt);
    if (apiResult && typeof apiResult === 'object' && !Array.isArray(apiResult) && 'calories' in apiResult && 'protein' in apiResult && 'carbs' in apiResult && 'fat' in apiResult) {
      const o = apiResult as Record<string, unknown>;
      return { calories: Number(o.calories), protein: Number(o.protein), carbs: Number(o.carbs), fat: Number(o.fat) };
    }
    return estimateNutritionFallback(recipeName);
  }
}

function estimateNutritionFallback(recipeName: string): { calories: number; protein: number; carbs: number; fat: number } {
  const name = recipeName.toLowerCase();
  const nutrition = { calories: 400, protein: 15, carbs: 40, fat: 10 };

  const rules: { keywords: string[]; impact: Partial<typeof nutrition> }[] = [
    { keywords: ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'egg'], impact: { protein: 15, calories: 50 } },
    { keywords: ['rice', 'noodle', 'bread', 'potato'], impact: { carbs: 30, calories: 100 } },
    { keywords: ['fried', 'butter', 'cheese'], impact: { fat: 15, calories: 150 } },
    { keywords: ['salad', 'steamed', 'boiled', 'vegan'], impact: { calories: -100, fat: -5, carbs: -10 } },
    { keywords: ['soup'], impact: { calories: -50 } },
  ];

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (name.includes(kw)) {
        for (const [k, val] of Object.entries(rule.impact)) {
          const key = k as keyof typeof nutrition;
          if (key in nutrition && typeof val === 'number') nutrition[key] += val;
        }
      }
    }
  }

  for (const k of Object.keys(nutrition) as (keyof typeof nutrition)[]) nutrition[k] = Math.max(0, nutrition[k]);
  for (const k of Object.keys(nutrition) as (keyof typeof nutrition)[]) {
    const v = nutrition[k];
    const variance = Math.floor(v * 0.1);
    nutrition[k] += Math.floor(Math.random() * (2 * variance + 1)) - variance;
    nutrition[k] = Math.max(0, nutrition[k]);
  }
  return nutrition;
}
