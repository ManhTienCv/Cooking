import * as followRepo from '../repos/followRepo.js';
import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import * as recipeRepo from '../repos/recipeRepo.js';
import * as blogRepo from '../repos/blogRepo.js';
import { pool } from '../db/pool.js';

export async function getPublicProfile(targetUserId: number, viewerId: number | null) {
  const { rows } = await pool.query<{
    id: number;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    created_at: Date;
  }>(
    `SELECT id, full_name, bio, avatar_url, created_at
     FROM users WHERE id = $1`,
    [targetUserId]
  );
  const user = rows[0];
  if (!user) throw { status: 404, message: 'Không tìm thấy người dùng.' };

  const sellerProfile = await marketplaceRepo.getSellerProfile(targetUserId);
  const [followerCount, followingCount, recipeCount, postCount] = await Promise.all([
    followRepo.getFollowerCount(targetUserId),
    followRepo.getFollowingCount(targetUserId),
    recipeRepo.countPublicRecipesByAuthor(targetUserId),
    blogRepo.countPublicPostsByAuthor(targetUserId),
  ]);

  let isFollowing = false;
  if (viewerId && viewerId !== targetUserId) {
    isFollowing = await followRepo.isFollowing(viewerId, targetUserId);
  }

  let sellerStats = null;
  if (sellerProfile) {
    sellerStats = await marketplaceRepo.getSellerStats(targetUserId);
  }

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    seller: sellerProfile
      ? {
          store_name: sellerProfile.store_name,
          store_description: sellerProfile.store_description,
          is_verified: sellerProfile.is_verified,
          rating: sellerProfile.rating,
          total_sales: sellerProfile.total_sales,
          stats: sellerStats,
        }
      : null,
    counts: {
      followers: followerCount,
      following: followingCount,
      recipes: recipeCount,
      posts: postCount,
    },
    is_following: isFollowing,
    is_self: viewerId === targetUserId,
  };
}

export async function getPublicProducts(targetUserId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(48, Math.max(1, Number(limitRaw) || 12));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const isSeller = await marketplaceRepo.isSeller(targetUserId);
  if (!isSeller) return { products: [], total: 0, limit, offset };
  const { rows, total } = await marketplaceRepo.getPublicProductsBySeller(targetUserId, limit, offset);
  return { products: rows, total, limit, offset };
}

export async function getPublicRecipes(targetUserId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(48, Math.max(1, Number(limitRaw) || 12));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const [recipes, total] = await Promise.all([
    recipeRepo.getPublicRecipesByAuthor(targetUserId, limit, offset),
    recipeRepo.countPublicRecipesByAuthor(targetUserId),
  ]);
  return { recipes, total, limit, offset };
}

export async function getPublicPosts(targetUserId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(48, Math.max(1, Number(limitRaw) || 12));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const [posts, total] = await Promise.all([
    blogRepo.getPublicPostsByAuthor(targetUserId, limit, offset),
    blogRepo.countPublicPostsByAuthor(targetUserId),
  ]);
  return { posts, total, limit, offset };
}

export async function toggleFollow(viewerId: number, targetUserId: number) {
  if (viewerId === targetUserId) throw { status: 400, message: 'Không thể theo dõi chính mình.' };
  const target = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
  if (target.rowCount === 0) throw { status: 404, message: 'Không tìm thấy người dùng.' };

  const already = await followRepo.isFollowing(viewerId, targetUserId);
  if (already) {
    await followRepo.unfollowUser(viewerId, targetUserId);
    return { following: false };
  }
  await followRepo.followUser(viewerId, targetUserId);
  return { following: true };
}
