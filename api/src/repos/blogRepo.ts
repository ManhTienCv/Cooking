import { pool } from '../db/pool.js';

type DbRow = Record<string, unknown>;

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
