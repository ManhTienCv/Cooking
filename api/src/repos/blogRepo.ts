import { pool } from '../db/pool.js';
import { DEFAULT_BLOG_CATEGORIES, slugify } from '../data/defaultCategories.js';

type DbRow = Record<string, unknown>;

async function ensureDefaultCategories(): Promise<void> {
  for (const name of DEFAULT_BLOG_CATEGORIES) {
    const slug = slugify(name);
    await pool.query(
      `INSERT INTO blog_categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [name, slug]
    );
  }
}

function isAllCategory(category: string | null): boolean {
  return !category || category === 'Tat ca' || category === 'Tất cả';
}

export async function searchPosts(search: string | null, category: string | null, limit: number, offset: number): Promise<DbRow[]> {
  let sql = `SELECT p.*, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar, u.email AS author_email
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     LEFT JOIN users u ON p.author_id = u.id
     WHERE p.status = 'approved'`;
  const params: (string | number)[] = [];

  if (search) {
    sql += ` AND (p.title ILIKE $${params.length + 1} OR p.content ILIKE $${params.length + 2})`;
    const t = `%${search}%`;
    params.push(t, t);
  }
  if (!isAllCategory(category)) {
    sql += ` AND c.name = $${params.length + 1}`;
    params.push(category as string);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function searchPostsWithViewer(
  search: string | null,
  category: string | null,
  viewerId: number,
  limit: number,
  offset: number
): Promise<DbRow[]> {
  let sql = `SELECT p.*, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar, u.email AS author_email
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     LEFT JOIN users u ON p.author_id = u.id
     WHERE (p.status = 'approved' OR p.author_id = $1)`;
  const params: (string | number)[] = [viewerId];

  if (search) {
    sql += ` AND (p.title ILIKE $${params.length + 1} OR p.content ILIKE $${params.length + 2})`;
    const t = `%${search}%`;
    params.push(t, t);
  }
  if (!isAllCategory(category)) {
    sql += ` AND c.name = $${params.length + 1}`;
    params.push(category as string);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function getPostById(id: number, viewerId: number | null): Promise<DbRow | null> {
  const v = viewerId ?? 0;
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar, u.email AS author_email
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     LEFT JOIN users u ON p.author_id = u.id
     WHERE p.id = $1 AND (p.status = 'approved' OR p.author_id = $2)`,
    [id, v]
  );
  return rows[0] ?? null;
}

export async function countSearchPosts(search: string | null, category: string | null): Promise<number> {
  let sql = `SELECT COUNT(*) AS total
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     WHERE p.status = 'approved'`;
  const params: string[] = [];

  if (search) {
    sql += ` AND (p.title ILIKE $${params.length + 1} OR p.content ILIKE $${params.length + 2})`;
    const t = `%${search}%`;
    params.push(t, t);
  }
  if (!isAllCategory(category)) {
    sql += ` AND c.name = $${params.length + 1}`;
    params.push(category as string);
  }

  const { rows } = await pool.query(sql, params);
  return Number(rows[0]?.total ?? 0);
}

export async function countSearchPostsWithViewer(
  search: string | null,
  category: string | null,
  viewerId: number
): Promise<number> {
  let sql = `SELECT COUNT(*) AS total
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     WHERE (p.status = 'approved' OR p.author_id = $1)`;
  const params: (string | number)[] = [viewerId];

  if (search) {
    sql += ` AND (p.title ILIKE $${params.length + 1} OR p.content ILIKE $${params.length + 2})`;
    const t = `%${search}%`;
    params.push(t, t);
  }
  if (!isAllCategory(category)) {
    sql += ` AND c.name = $${params.length + 1}`;
    params.push(category as string);
  }

  const { rows } = await pool.query(sql, params);
  return Number(rows[0]?.total ?? 0);
}

export async function getCategories(): Promise<DbRow[]> {
  await ensureDefaultCategories();
  const { rows } = await pool.query('SELECT id, name FROM blog_categories ORDER BY name ASC');
  return rows;
}

export async function ensureCategoryExists(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;
  const slug = slugify(trimmed);
  if (!slug) return null;

  await pool.query(
    `INSERT INTO blog_categories (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO NOTHING`,
    [trimmed, slug]
  );

  const r = await pool.query(
    `SELECT id FROM blog_categories WHERE slug = $1 OR name = $2 LIMIT 1`,
    [slug, trimmed]
  );
  return Number(r.rows[0]?.id ?? 0) || null;
}

export async function createPost(data: {
  title: string;
  content: string;
  excerpt: string | null;
  imageUrl: string | null;
  categoryId: number;
  authorId: number;
  slug: string;
}): Promise<number | null> {
  const r = await pool.query(
    `INSERT INTO blog_posts (title, slug, excerpt, content, image_url, category_id, author_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING id`,
    [
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.imageUrl,
      data.categoryId,
      data.authorId,
    ]
  );
  return Number(r.rows[0]?.id ?? 0) || null;
}

export async function getPostsByAuthor(authorId: number, limit: number, offset: number): Promise<DbRow[]> {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM blog_posts p
     LEFT JOIN blog_categories c ON p.category_id = c.id
     WHERE p.author_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [authorId, limit, offset]
  );
  return rows;
}

export async function countPostsByAuthor(authorId: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM blog_posts
     WHERE author_id = $1`,
    [authorId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function deletePost(id: number): Promise<void> {
  await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
}

export async function updatePost(
  id: number,
  authorId: number,
  data: { title?: string; content?: string; excerpt?: string | null; imageUrl?: string | null; categoryId?: number }
): Promise<boolean> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  let idx = 1;

  if (data.title !== undefined) { sets.push(`title = $${idx++}`); params.push(data.title); }
  if (data.content !== undefined) { sets.push(`content = $${idx++}`); params.push(data.content); }
  if (data.excerpt !== undefined) { sets.push(`excerpt = $${idx++}`); params.push(data.excerpt); }
  if (data.imageUrl !== undefined) { sets.push(`image_url = $${idx++}`); params.push(data.imageUrl); }
  if (data.categoryId !== undefined && data.categoryId > 0) { sets.push(`category_id = $${idx++}`); params.push(data.categoryId); }

  if (sets.length === 0) return false;

  sets.push(`updated_at = NOW()`);
  params.push(id, authorId);

  const r = await pool.query(
    `UPDATE blog_posts SET ${sets.join(', ')} WHERE id = $${idx++} AND author_id = $${idx}`,
    params
  );
  return (r.rowCount ?? 0) > 0;
}
