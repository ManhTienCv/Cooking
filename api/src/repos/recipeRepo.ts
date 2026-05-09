import { pool } from '../db/pool.js';
import { DEFAULT_RECIPE_CATEGORIES, slugify } from '../data/defaultCategories.js';
import { Recipe, RecipeWithAuthor, RecipeCategory } from '../types/recipe.js';

async function ensureDefaultCategories(): Promise<void> {
  for (const name of DEFAULT_RECIPE_CATEGORIES) {
    const slug = slugify(name);
    await pool.query(
      `INSERT INTO recipe_categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [name, slug]
    );
  }
}

function parseTotal(v: unknown): number {
  return Number(v ?? 0);
}

function isAllCategory(category: string | null): boolean {
  return !category || category === 'Tat ca' || category === 'Tất cả';
}

export async function getFeaturedRecipes(limit = 6): Promise<RecipeWithAuthor[]> {
  const { rows } = await pool.query(
    `SELECT r.*, r.calories, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE r.status = 'approved'
     ORDER BY r.is_featured DESC, r.views DESC, r.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows as RecipeWithAuthor[];
}

export async function searchRecipes(search: string | null, category: string | null, limit: number, offset: number): Promise<RecipeWithAuthor[]> {
  const conditions: string[] = ["r.status = 'approved'"];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push(`(r.title ILIKE $${params.length + 1} OR r.description ILIKE $${params.length + 1} OR r.ingredients ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  if (!isAllCategory(category)) {
    conditions.push(`c.name = $${params.length + 1}`);
    params.push(category as string);
  }

  const sql = `SELECT r.*, r.calories, r.protein, r.carbs, r.fat, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(sql, params);
  return rows as RecipeWithAuthor[];
}

export async function searchRecipesWithViewer(
  search: string | null,
  category: string | null,
  viewerId: number,
  limit: number,
  offset: number
): Promise<RecipeWithAuthor[]> {
  const conditions: string[] = ["(r.status = 'approved' OR r.author_id = $1)"];
  const params: (string | number)[] = [viewerId];

  if (search) {
    conditions.push(`(r.title ILIKE $${params.length + 1} OR r.description ILIKE $${params.length + 1} OR r.ingredients ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  if (!isAllCategory(category)) {
    conditions.push(`c.name = $${params.length + 1}`);
    params.push(category as string);
  }

  const sql = `SELECT r.*, r.calories, r.protein, r.carbs, r.fat, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(sql, params);
  return rows as RecipeWithAuthor[];
}

export async function countSearchRecipes(search: string | null, category: string | null): Promise<number> {
  const conditions: string[] = ["r.status = 'approved'"];
  const params: string[] = [];

  if (search) {
    conditions.push(`(r.title ILIKE $${params.length + 1} OR r.description ILIKE $${params.length + 1} OR r.ingredients ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  if (!isAllCategory(category)) {
    conditions.push(`c.name = $${params.length + 1}`);
    params.push(category as string);
  }

  const sql = `SELECT COUNT(*) AS total
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     WHERE ${conditions.join(' AND ')}`;

  const { rows } = await pool.query(sql, params);
  return parseTotal(rows[0]?.total);
}

export async function countSearchRecipesWithViewer(
  search: string | null,
  category: string | null,
  viewerId: number
): Promise<number> {
  const conditions: string[] = ["(r.status = 'approved' OR r.author_id = $1)"];
  const params: (string | number)[] = [viewerId];

  if (search) {
    conditions.push(`(r.title ILIKE $${params.length + 1} OR r.description ILIKE $${params.length + 1} OR r.ingredients ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  if (!isAllCategory(category)) {
    conditions.push(`c.name = $${params.length + 1}`);
    params.push(category as string);
  }

  const sql = `SELECT COUNT(*) AS total
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     WHERE ${conditions.join(' AND ')}`;

  const { rows } = await pool.query(sql, params);
  return parseTotal(rows[0]?.total);
}

export async function getRecipeById(id: number, viewerId: number | null): Promise<RecipeWithAuthor | null> {
  const v = viewerId ?? 0;
  const { rows } = await pool.query(
    `SELECT r.*, r.calories, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar, u.email AS author_email
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE r.id = $1 AND (r.status = 'approved' OR r.author_id = $2)`,
    [id, v]
  );
  return (rows[0] as RecipeWithAuthor) ?? null;
}

export async function incrementViews(recipeId: number, userId: number | null): Promise<boolean> {
  if (userId) {
    const dup = await pool.query('SELECT id FROM recipe_views WHERE user_id = $1 AND recipe_id = $2', [userId, recipeId]);
    if (dup.rows.length > 0) return false;
    await pool.query('INSERT INTO recipe_views (user_id, recipe_id) VALUES ($1, $2)', [userId, recipeId]);
  }
  await pool.query('UPDATE recipes SET views = views + 1 WHERE id = $1', [recipeId]);
  return true;
}

export async function getCategories(): Promise<RecipeCategory[]> {
  await ensureDefaultCategories();
  const { rows } = await pool.query('SELECT id, name, slug, description FROM recipe_categories ORDER BY name ASC');
  return rows as RecipeCategory[];
}

export async function isSaved(userId: number, recipeId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT id FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2', [userId, recipeId]);
  return rows.length > 0;
}

export async function toggleSave(userId: number, recipeId: number): Promise<boolean> {
  if (await isSaved(userId, recipeId)) {
    await pool.query('DELETE FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2', [userId, recipeId]);
    return false;
  }
  await pool.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, $2)', [userId, recipeId]);
  return true;
}

export async function createRecipe(data: {
  title: string;
  description: string | null;
  ingredients: string;
  instructions: string;
  difficulty: string;
  cookingTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  categoryId: number;
  authorId: number;
}): Promise<number | null> {
  const r = await pool.query(
    `INSERT INTO recipes (
      title, description, ingredients, instructions, difficulty,
      cooking_time, servings, image_url, category_id, author_id, status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
    RETURNING id`,
    [
      data.title,
      data.description,
      data.ingredients,
      data.instructions,
      data.difficulty,
      data.cookingTime,
      data.servings,
      data.imageUrl,
      data.categoryId,
      data.authorId,
    ]
  );
  return Number(r.rows[0]?.id ?? 0) || null;
}

export async function getRecipesByAuthor(authorId: number, limit: number, offset: number): Promise<Recipe[]> {
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS category_name
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     WHERE r.author_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [authorId, limit, offset]
  );
  return rows as Recipe[];
}

export async function countRecipesByAuthor(authorId: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM recipes
     WHERE author_id = $1`,
    [authorId]
  );
  return parseTotal(rows[0]?.total);
}

export async function getSavedRecipesByUser(userId: number, limit: number, offset: number): Promise<RecipeWithAuthor[]> {
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS category_name, s.created_at AS saved_at
     FROM saved_recipes s
     JOIN recipes r ON r.id = s.recipe_id
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows as RecipeWithAuthor[];
}

export async function countSavedRecipesByUser(userId: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM saved_recipes
     WHERE user_id = $1`,
    [userId]
  );
  return parseTotal(rows[0]?.total);
}

export async function searchRecipesByIngredients(ingredients: string[], limit: number, offset: number): Promise<{ rows: RecipeWithAuthor[]; total: number }> {
  if (!ingredients || ingredients.length === 0) return { rows: [], total: 0 };

  const validIngredients = ingredients
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 10);

  if (validIngredients.length === 0) return { rows: [], total: 0 };

  const conditions: string[] = ["r.status = 'approved'"];
  const params: (string | number)[] = [];
  const matchCases: string[] = [];
  const orConditions: string[] = [];
  
  validIngredients.forEach(ing => {
    params.push(`%${ing}%`);
    const paramIdx = params.length;
    matchCases.push(`(CASE WHEN r.ingredients ILIKE $${paramIdx} THEN 1 ELSE 0 END)`);
    orConditions.push(`r.ingredients ILIKE $${paramIdx}`);
  });

  conditions.push(`(${orConditions.join(' OR ')})`);
  const matchCountSql = matchCases.join(' + ');

  const sql = `SELECT r.*, r.calories, r.protein, r.carbs, r.fat, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar,
               (${matchCountSql}) AS match_count
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY match_count DESC, r.views DESC, r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
     
  const countSql = `SELECT COUNT(*) AS total
     FROM recipes r
     WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(sql, [...params, limit, offset]),
    pool.query(countSql, params)
  ]);

  return {
    rows: dataResult.rows as RecipeWithAuthor[],
    total: parseTotal(countResult.rows[0]?.total)
  };
}

export async function updateRecipe(id: number, authorId: number, data: {
  title?: string;
  description?: string | null;
  ingredients?: string;
  instructions?: string;
  difficulty?: string;
  cookingTime?: number | null;
  servings?: number | null;
  imageUrl?: string | null;
  categoryId?: number;
}): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.title !== undefined) { sets.push(`title = $${idx++}`); params.push(data.title); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (data.ingredients !== undefined) { sets.push(`ingredients = $${idx++}`); params.push(data.ingredients); }
  if (data.instructions !== undefined) { sets.push(`instructions = $${idx++}`); params.push(data.instructions); }
  if (data.difficulty !== undefined) { sets.push(`difficulty = $${idx++}`); params.push(data.difficulty); }
  if (data.cookingTime !== undefined) { sets.push(`cooking_time = $${idx++}`); params.push(data.cookingTime); }
  if (data.servings !== undefined) { sets.push(`servings = $${idx++}`); params.push(data.servings); }
  if (data.imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(data.imageUrl); }
  if (data.categoryId !== undefined) { sets.push(`category_id = $${idx++}`); params.push(data.categoryId); }

  if (sets.length === 0) return false;
  sets.push(`updated_at = NOW()`);

  params.push(id, authorId);
  const { rowCount } = await pool.query(
    `UPDATE recipes SET ${sets.join(', ')} WHERE id = $${idx++} AND author_id = $${idx}`,
    params
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteRecipe(id: number): Promise<void> {
  await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
}
