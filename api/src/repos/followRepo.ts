import { pool } from '../db/pool.js';

export async function followUser(followerId: number, followingId: number): Promise<boolean> {
  if (followerId === followingId) return false;
  const { rowCount } = await pool.query(
    `INSERT INTO user_follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [followerId, followingId]
  );
  return (rowCount ?? 0) > 0;
}

export async function unfollowUser(followerId: number, followingId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  return (rowCount ?? 0) > 0;
}

export async function isFollowing(followerId: number, followingId: number): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1',
    [followerId, followingId]
  );
  return rows.length > 0;
}

export async function getFollowerCount(userId: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM user_follows WHERE following_id = $1',
    [userId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getFollowingCount(userId: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM user_follows WHERE follower_id = $1',
    [userId]
  );
  return Number(rows[0]?.count ?? 0);
}
