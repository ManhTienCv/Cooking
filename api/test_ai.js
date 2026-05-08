import { generateContent } from './dist/services/aiService.js';
const prompt = `You are a Vietnamese nutritionist. Create a 7-day meal plan.

REQUIREMENTS:
- Target: ~2000 kcal/day (distribute: breakfast ~25%, lunch ~40%, dinner ~35%)
- Diet type: "Cân bằng" — Balanced diet. Mix of protein, carbs, and healthy fats. Include diverse Vietnamese dishes with rice, noodles, meat, seafood, and vegetables.
- Each day has 3 meals: breakfast, lunch, dinner (1 main dish each)
- Use REAL Vietnamese dish names (e.g. Phở bò, Bún chả, Cơm tấm, Gỏi cuốn...)
- Each dish must have realistic calories, protein, carbs, fat values
- Vary dishes across days — no repeating the same dish
- Total daily calories should be close to 2000 (±10%)

Return ONLY a JSON array, no markdown:
[{"day":0,"meals":{"breakfast":[{"name":"Phở bò","calories":450,"protein":25,"carbs":50,"fat":12}],"lunch":[{"name":"Cơm tấm","calories":650,"protein":30,"carbs":70,"fat":20}],"dinner":[{"name":"Canh chua","calories":350,"protein":28,"carbs":15,"fat":8}]}}]
"day" is 0-indexed. No explanations, no markdown.`;
generateContent(prompt, true, 30000).then(res => {
  console.log(JSON.stringify(res, null, 2));
}).catch(err => console.error(err));
