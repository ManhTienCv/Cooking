import { pool } from '../db/pool.js';

type DbRow = Record<string, unknown>;

function parseTotal(v: unknown): number {
  return Number(v ?? 0);
}

function isAllCategory(category: string | null): boolean {
  return !category || category === 'Tat ca' || category === 'Tất cả';
}

export async function getFeaturedRecipes(limit = 6): Promise<DbRow[]> {
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
  return rows;
}

export async function searchRecipes(search: string | null, category: string | null, limit: number, offset: number): Promise<DbRow[]> {
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
  return rows;
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

export async function getRecipeById(id: number, viewerId: number | null): Promise<DbRow | null> {
  const v = viewerId ?? 0;
  const { rows } = await pool.query(
    `SELECT r.*, r.calories, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar, u.email AS author_email
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE r.id = $1 AND (r.status = 'approved' OR r.author_id = $2)`,
    [id, v]
  );
  return rows[0] ?? null;
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

export async function getCategories(): Promise<DbRow[]> {
  const { rows } = await pool.query('SELECT id, name FROM recipe_categories ORDER BY name ASC');
  return rows;
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

export async function searchRecipesApprovedNoPagination(): Promise<DbRow[]> {
  const { rows } = await pool.query(
    `SELECT r.*, r.calories, r.protein, r.carbs, r.fat, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar
     FROM recipes r
     LEFT JOIN recipe_categories c ON r.category_id = c.id
     LEFT JOIN users u ON r.author_id = u.id
     WHERE r.status = 'approved'
     ORDER BY r.created_at DESC`
  );
  return rows;
}
