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

  // Lấy danh sách thực đơn (bữa sáng, trưa, tối) của kế hoạch ăn uống hiện tại từ cơ sở dữ liệu
  async getMealPlan(): Promise<Record<string, { breakfast: unknown[]; lunch: unknown[]; dinner: unknown[] }>> {
    return healthRepo.getPlanMeals(this.pool, this.planId);
  }

  // Thêm một món ăn vào thực đơn của một ngày và bữa ăn cụ thể, ước tính dinh dưỡng bằng AI và trả về danh sách thực đơn cùng tổng dinh dưỡng mới
  async addRecipe(date: string, mealType: string, recipe: PlanMealRecipeInput): Promise<{
    success: boolean;
    message: string;
    mealPlan?: unknown[];
    nutritionTotals?: { calories: number; protein: number; carbs: number; fat: number };
  }> {
    let nutrition;
    try {
      nutrition = await this.estimateNutrition(recipe.name);
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Tên món ăn không hợp lệ hoặc không có thật.' };
    }

    const withNutrition = { ...recipe, nutrition };
    const ok = await healthRepo.addMeal(this.pool, this.planId, date, mealType, withNutrition);
    if (!ok) return { success: false, message: 'Không thể lưu món ăn vào cơ sở dữ liệu.' };

    const mealPlan = await this.getMealPlan();
    const day = mealPlan[date]?.[mealType as 'breakfast' | 'lunch' | 'dinner'] ?? [];
    return {
      success: true,
      message: `Đã thêm ${recipe.name} vào thực đơn.`,
      mealPlan: day,
      nutritionTotals: healthRepo.getNutritionTotalsFromMeals(mealPlan),
    };
  }

  // Xóa một món ăn khỏi thực đơn dựa trên ID món ăn, sau đó cập nhật lại thực đơn và tính lại tổng dinh dưỡng
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
    if (!ok) return { success: false, message: 'Không tìm thấy món ăn hoặc xóa thất bại.' };

    const mealPlan = await this.getMealPlan();
    const day = mealPlan[date]?.[mealType as 'breakfast' | 'lunch' | 'dinner'] ?? [];
    return {
      success: true,
      message: 'Đã xóa món ăn.',
      mealPlan: day,
      nutritionTotals: healthRepo.getNutritionTotalsFromMeals(mealPlan),
    };
  }

  // Lấy danh sách nguyên liệu cần mua (Shopping List) thuộc kế hoạch ăn uống này
  getShoppingList(): Promise<{ id: number; name: string; quantity: string; checked: boolean }[]> {
    return healthRepo.getShoppingList(this.pool, this.planId);
  }

  // Thêm một mặt hàng/nguyên liệu mới vào danh sách mua sắm
  async addShoppingItem(name: string, quantity = ''): Promise<{
    success: boolean;
    message: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const n = name.trim();
    if (!n) return { success: false, message: 'Tên là bắt buộc.' };
    const ok = await healthRepo.addShoppingItem(this.pool, this.planId, n, quantity.trim());
    if (!ok) return { success: false, message: 'Không thể lưu mục mua sắm.' };
    return { success: true, message: `Đã thêm ${n}.`, shoppingList: await this.getShoppingList() };
  }

  // Đánh dấu (tick/untick) một mặt hàng trong danh sách mua sắm là đã mua hoặc chưa mua
  async toggleShoppingItem(itemId: number): Promise<{
    success: boolean;
    message?: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const ok = await healthRepo.toggleShoppingItem(this.pool, itemId, this.planId);
    if (!ok) return { success: false, message: 'Cập nhật thất bại.' };
    return { success: true, shoppingList: await this.getShoppingList() };
  }

  // Xóa hoàn toàn một mặt hàng khỏi danh sách mua sắm
  async removeShoppingItem(itemId: number): Promise<{
    success: boolean;
    message: string;
    shoppingList?: { id: number; name: string; quantity: string; checked: boolean }[];
  }> {
    const ok = await healthRepo.removeShoppingItem(this.pool, itemId, this.planId);
    if (!ok) return { success: false, message: 'Xóa thất bại.' };
    return { success: true, message: 'Đã xóa.', shoppingList: await this.getShoppingList() };
  }

  /**
   * Tự động sinh thực đơn 7 ngày bằng Gemini AI dựa trên mục tiêu calo và chế độ ăn.
   */
  async autoGenerateMeals(
    startDate: string,
    days: number,
    targetCalories: number,
    dietType: string
  ): Promise<{ success: boolean; message: string }> {
    const dietInstructions = getDietInstructions(dietType);
    const prompt = `You are a Vietnamese nutritionist. Create a ${days}-day meal plan.

REQUIREMENTS:
- Target: ~${targetCalories} kcal/day (distribute: breakfast ~25%, lunch ~40%, dinner ~35%)
- Diet type: "${dietType}" — ${dietInstructions}
- Each day has 3 meals: breakfast, lunch, dinner (1 main dish each)
- Use REAL Vietnamese dish names (e.g. Phở bò, Bún chả, Cơm tấm, Gỏi cuốn...)
- Each dish must have realistic calories, protein, carbs, fat values
- Vary dishes across days — no repeating the same dish
- Total daily calories should be close to ${targetCalories} (±10%)

Return ONLY a JSON array, no markdown:
[{"day":0,"meals":{"breakfast":[{"name":"Phở bò","calories":450,"protein":25,"carbs":50,"fat":12}],"lunch":[{"name":"Cơm tấm","calories":650,"protein":30,"carbs":70,"fat":20}],"dinner":[{"name":"Canh chua","calories":350,"protein":28,"carbs":15,"fat":8}]}}]
"day" is 0-indexed. No explanations, no markdown.`;

    try {
      const result = await generateContent(prompt, true, 30_000);
      if (Array.isArray(result) && result.length > 0) {
        const saved = await this.saveMealsFromAiResult(result, startDate, days);
        if (saved > 0) return { success: true, message: `AI đã tạo ${saved} món ăn cho ${days} ngày.` };
      }
    } catch (err) {
      console.error('[AutoGenerate] AI failed, using fallback:', err instanceof Error ? err.message : err);
    }

    // Fallback: dùng thực đơn mẫu khi AI không khả dụng
    console.log('[AutoGenerate] Using fallback meal templates');
    const saved = await this.saveFallbackMeals(startDate, days, targetCalories, dietType);
    return { success: true, message: `Đã tạo ${saved} món ăn mẫu cho ${days} ngày (AI tạm thời không khả dụng).` };
  }

  // Lưu danh sách món ăn được trả về từ kết quả AI vào cơ sở dữ liệu tương ứng với từng ngày
  private async saveMealsFromAiResult(result: unknown[], startDate: string, days: number): Promise<number> {
    const parts = startDate.split('-');
    const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    let addedCount = 0;

    let idx = 0;
    for (const dayData of result as { meals: Record<string, { name: string; calories?: number; protein?: number; carbs?: number; fat?: number }[]> }[]) {
      const offset = idx++;
      if (offset >= days) break;
      const current = new Date(baseDate);
      current.setDate(current.getDate() + offset);
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

      for (const [mealType, dishes] of Object.entries(dayData.meals ?? {})) {
        for (const dish of dishes) {
          if (!dish.name) continue;
          const recipe: PlanMealRecipeInput = {
            id: '', name: dish.name, note: '', isCustom: false,
            nutrition: { calories: Number(dish.calories ?? 400), protein: Number(dish.protein ?? 15), carbs: Number(dish.carbs ?? 40), fat: Number(dish.fat ?? 10) },
          };
          await healthRepo.addMeal(this.pool, this.planId, dateStr, mealType, recipe);
          addedCount++;
        }
      }
    }
    return addedCount;
  }

  // Lưu thực đơn mẫu (dự phòng khi AI không khả dụng) vào cơ sở dữ liệu, tự động căn chỉnh calo theo tỷ lệ mục tiêu
  private async saveFallbackMeals(startDate: string, days: number, targetCalories: number, dietType: string): Promise<number> {
    const breakfastPool = [
      { name: 'Phở bò', cal: 450, p: 25, c: 55, f: 12 },
      { name: 'Bún bò Huế', cal: 480, p: 28, c: 50, f: 14 },
      { name: 'Bánh mì trứng ốp la', cal: 380, p: 18, c: 45, f: 15 },
      { name: 'Cháo gà', cal: 320, p: 20, c: 40, f: 8 },
      { name: 'Xôi gà', cal: 420, p: 22, c: 55, f: 10 },
      { name: 'Bún riêu cua', cal: 400, p: 22, c: 48, f: 12 },
      { name: 'Hủ tiếu Nam Vang', cal: 450, p: 25, c: 52, f: 13 },
      { name: 'Bánh cuốn Thanh Trì', cal: 350, p: 16, c: 42, f: 10 },
    ];
    const lunchPool = [
      { name: 'Cơm tấm sườn bì chả', cal: 650, p: 32, c: 70, f: 22 },
      { name: 'Cơm gà xối mỡ', cal: 600, p: 30, c: 65, f: 20 },
      { name: 'Bún chả Hà Nội', cal: 550, p: 28, c: 55, f: 18 },
      { name: 'Cơm rang dưa bò', cal: 580, p: 26, c: 65, f: 18 },
      { name: 'Mì Quảng', cal: 520, p: 25, c: 58, f: 15 },
      { name: 'Cơm chiên dương châu', cal: 560, p: 22, c: 68, f: 16 },
      { name: 'Bánh xèo nhân tôm thịt', cal: 500, p: 24, c: 45, f: 22 },
      { name: 'Bún thịt nướng', cal: 530, p: 27, c: 58, f: 16 },
    ];
    const dinnerPool = [
      { name: 'Canh chua cá lóc', cal: 350, p: 28, c: 20, f: 10 },
      { name: 'Gà kho gừng + rau luộc', cal: 400, p: 30, c: 25, f: 12 },
      { name: 'Cá kho tộ + canh rau', cal: 380, p: 27, c: 22, f: 14 },
      { name: 'Thịt ba chỉ kho trứng', cal: 450, p: 25, c: 15, f: 28 },
      { name: 'Đậu hũ sốt cà chua', cal: 300, p: 18, c: 25, f: 12 },
      { name: 'Lẩu thái hải sản', cal: 420, p: 32, c: 28, f: 14 },
      { name: 'Sườn xào chua ngọt', cal: 430, p: 24, c: 30, f: 18 },
      { name: 'Tôm rim + canh bí đao', cal: 370, p: 26, c: 22, f: 12 },
    ];

    // Adjust portions based on target calories
    const ratio = targetCalories / 2000;

    const parts = startDate.split('-');
    const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    let addedCount = 0;

    for (let i = 0; i < days; i++) {
      const current = new Date(baseDate);
      current.setDate(current.getDate() + i);
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

      const bf = breakfastPool[i % breakfastPool.length];
      const lc = lunchPool[i % lunchPool.length];
      const dn = dinnerPool[i % dinnerPool.length];

      for (const [mealType, dish] of [['breakfast', bf], ['lunch', lc], ['dinner', dn]] as const) {
        const recipe: PlanMealRecipeInput = {
          id: '', name: dish.name, note: '', isCustom: false,
          nutrition: {
            calories: Math.round(dish.cal * ratio),
            protein: Math.round(dish.p * ratio),
            carbs: Math.round(dish.c * ratio),
            fat: Math.round(dish.f * ratio),
          },
        };
        await healthRepo.addMeal(this.pool, this.planId, dateStr, mealType, recipe);
        addedCount++;
      }
    }
    return addedCount;
  }

  // Ước lượng dinh dưỡng (calo, đạm, tinh bột, chất béo) của món ăn bằng Gemini AI. 
  // Nếu AI từ chối (món ăn không có thật hoặc vô nghĩa), hàm sẽ báo lỗi. 
  // Nếu AI lỗi hệ thống, hàm sẽ tự động dùng thuật toán ước tính dự phòng (fallback).
  private async estimateNutrition(recipeName: string): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
    const prompt = `You are a strict nutritionist evaluating food items.
Evaluate if the string '${recipeName}' represents a real, valid, edible food, dish, or beverage.
Rules:
1. If the string is gibberish (e.g., 'a', 'abc', 'asdf'), a random word (e.g., 'car', 'hello'), offensive, or a non-food item, you MUST return exactly: {"valid": false}.
2. If it is a real food/beverage, estimate its nutritional values for 1 serving and return ONLY a JSON object:
{"valid": true, "calories": integer, "protein": integer, "carbs": integer, "fat": integer}
Do not include any markdown formatting, code blocks, or explanations. Just the JSON object.`;

    const apiResult = await generateContent(prompt);
    if (apiResult && typeof apiResult === 'object' && !Array.isArray(apiResult)) {
      const o = apiResult as Record<string, unknown>;
      if (o.valid === false || o.valid === 'false') {
        throw new Error('Tên món ăn không hợp lệ hoặc không có thật.');
      }
      if (o.valid === true || o.valid === 'true' || ('calories' in o && 'protein' in o)) {
        return { 
          calories: Number(o.calories || 0), 
          protein: Number(o.protein || 0), 
          carbs: Number(o.carbs || 0), 
          fat: Number(o.fat || 0) 
        };
      }
    }
    
    if (recipeName.trim().length < 3) {
      throw new Error('Tên món ăn quá ngắn hoặc không hợp lệ. Vui lòng nhập tên món ăn thực tế.');
    }
    return estimateNutritionFallback(recipeName);
  }
}

function estimateNutritionFallback(recipeName: string): { calories: number; protein: number; carbs: number; fat: number } {
  const name = recipeName.toLowerCase();
  
  const knownWords = ['cơm', 'phở', 'bún', 'bánh', 'thịt', 'cá', 'gà', 'bò', 'tôm', 'cua', 'mực', 'trứng', 'đậu', 'rau', 'canh', 'lẩu', 'cháo', 'xôi', 'mì', 'chè', 'kem', 'sữa', 'trà', 'nước', 'salad', 'chicken', 'beef', 'pork', 'fish', 'rice', 'noodle', 'soup', 'bread', 'pizza', 'burger', 'khoai', 'bơ', 'chuối', 'táo', 'cam'];
  const hasKnownWord = knownWords.some(w => name.includes(w));
  
  if (!hasKnownWord) {
    throw new Error('Tên món ăn không có thật hoặc hệ thống không thể nhận diện. Vui lòng nhập một món ăn cụ thể.');
  }

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

/**
 * Hướng dẫn chi tiết cho AI theo từng chế độ ăn — giúp AI tạo thực đơn phù hợp.
 */
function getDietInstructions(dietType: string): string {
  const map: Record<string, string> = {
    'Cân bằng':
      'Balanced diet. Mix of protein, carbs, and healthy fats. Include diverse Vietnamese dishes with rice, noodles, meat, seafood, and vegetables.',
    'Giảm cân':
      'Weight loss diet. Lower calories, high fiber, lean protein. Prefer light dishes: cháo, gỏi, salad, canh rau, thịt nạc hấp. Avoid fried foods and heavy sauces. Keep portions moderate.',
    'Tăng cân':
      'Weight gain diet. Higher calories with nutrient-dense foods. Include cơm nhiều, thịt kho, trứng chiên, xôi, bánh mì. Extra snacks. Protein + carbs focus.',
    'Chay':
      'Vegetarian/Vegan diet. NO meat, NO seafood, NO fish sauce. Use tofu, tempeh, mushrooms, beans, vegetables. Vietnamese vegetarian dishes only (cơm chay, canh rau, đậu hũ kho).',
    'Keto':
      'Keto diet. Very low carb (<10%), high fat (>60%), moderate protein. NO rice, NO noodles, NO bread. Focus on fatty meats, eggs, avocado, coconut-based dishes.',
    'Low-carb':
      'Low-carb diet. Minimize rice, noodles, bread. Focus on protein-rich dishes (grilled meat, fish, eggs) and vegetables. Carbs < 30% of calories.',
    'High-protein':
      'High-protein diet. Prioritize meat, fish, eggs, tofu in every meal. Protein > 35% of calories. Include dishes like gà nướng, bò lúc lắc, cá kho, trứng chiên, ức gà hấp.',
  };
  return map[dietType] ?? map['Cân bằng']!;
}
