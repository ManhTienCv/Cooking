import * as blogRepo from '../repos/blogRepo.js';
import { processImageBase64 } from '../lib/processImage.js';
import { filterContent } from '../lib/profanityFilter.js';
import { pool } from '../db/pool.js';
import { BlogPost, BlogPostWithAuthor } from '../types/blog.js';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export async function getMyPosts(userId: number, limitRaw: unknown, offsetRaw: unknown) {
  const limit = Math.min(100, Math.max(1, Number(limitRaw) || 20));
  const offset = Math.max(0, Number(offsetRaw) || 0);
  const [posts, total] = await Promise.all([
    blogRepo.getPostsByAuthor(userId, limit, offset),
    blogRepo.countPostsByAuthor(userId),
  ]);
  return { posts, total, limit, offset };
}

export async function getPostDetail(idRaw: unknown, viewerId: number | null) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid id' };
  const post = await blogRepo.getPostById(id, viewerId);
  if (!post) throw { status: 404, message: 'Not found' };
  return { post };
}

export async function searchPosts(query: {
  q?: unknown;
  category?: unknown;
  limit?: unknown;
  offset?: unknown;
  viewerId?: number | null;
}) {
  const search = query.q ? String(query.q).trim() || null : null;
  const category = query.category ? String(query.category) : null;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
  const offset = Math.max(0, Number(query.offset) || 0);
  const viewerId = query.viewerId ?? null;

  const [posts, total] = await Promise.all([
    viewerId
      ? blogRepo.searchPostsWithViewer(search, category, viewerId, limit, offset)
      : blogRepo.searchPosts(search, category, limit, offset),
    viewerId
      ? blogRepo.countSearchPostsWithViewer(search, category, viewerId)
      : blogRepo.countSearchPosts(search, category),
  ]);

  return { posts, total, limit, offset };
}

export async function createPost(userId: number, body: Record<string, unknown>) {
  const title = String(body?.title ?? '').trim();
  const content = String(body?.content ?? '').trim();
  const excerptRaw = String(body?.excerpt ?? '').trim();
  const imageUrlRaw = String(body?.image_url ?? '').trim();
  const categoryName = String(body?.category_name ?? '').trim();
  let categoryId = Number(body?.category_id ?? 0);

  if (title.length < 3) throw { status: 422, message: 'Tiêu đề phải có ít nhất 3 ký tự.' };
  if (content.length < 10) throw { status: 422, message: 'Nội dung bài viết quá ngắn (tối thiểu 10 ký tự).' };

  if (!categoryId && categoryName) {
    categoryId = (await blogRepo.ensureCategoryExists(categoryName)) ?? 0;
  }

  if (!categoryId) throw { status: 422, message: 'Vui lòng chọn danh mục bài viết.' };

  const finalImageUrl = processImageBase64(imageUrlRaw || null);
  const slugBase = slugify(title) || `post-${Date.now()}`;
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const id = await blogRepo.createPost({
    title,
    content,
    excerpt: excerptRaw || null,
    imageUrl: finalImageUrl,
    categoryId,
    authorId: userId,
    slug,
  });

  if (!id) throw { status: 400, message: 'Không thể tạo bài viết.' };
  return { id, status: 'pending' };
}

export async function updatePost(idRaw: unknown, userId: number, body: Record<string, unknown>) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid id' };

  const post = await blogRepo.getPostById(id, userId);
  if (!post || post.author_id !== userId) {
    throw { status: 403, message: 'Bạn không có quyền sửa bài viết này.' };
  }

  const title = body?.title != null ? String(body.title).trim() : undefined;
  const content = body?.content != null ? String(body.content).trim() : undefined;
  const imageUrlRaw = body?.image_url != null ? String(body.image_url).trim() : undefined;
  const categoryName = body?.category_name ? String(body.category_name).trim() : undefined;
  let categoryId = body?.category_id ? Number(body.category_id) : undefined;

  if (title !== undefined && title.length < 3) throw { status: 422, message: 'Tiêu đề phải có ít nhất 3 ký tự.' };
  if (content !== undefined && content.length < 10) throw { status: 422, message: 'Nội dung bài viết quá ngắn (tối thiểu 10 ký tự).' };

  if (!categoryId && categoryName) {
    categoryId = (await blogRepo.ensureCategoryExists(categoryName)) ?? undefined;
  }

  const finalImageUrl = imageUrlRaw !== undefined ? processImageBase64(imageUrlRaw || null) : undefined;

  const updated = await blogRepo.updatePost(id, userId, {
    title,
    content,
    excerpt: content ? content.slice(0, 180) : undefined,
    imageUrl: finalImageUrl,
    categoryId,
  });

  if (!updated) throw { status: 400, message: 'Không thể cập nhật bài viết.' };
  return { success: true };
}

export async function deletePost(idRaw: unknown, userId: number) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid id' };
  const post = await blogRepo.getPostById(id, userId);
  if (!post || post.author_id !== userId) throw { status: 403, message: 'Forbidden' };
  await blogRepo.deletePost(id);
  return { success: true };
}

/* ────────── Comments ────────── */

export async function getComments(postIdRaw: unknown) {
  const postId = Number(postIdRaw);
  if (!postId) return { comments: [] };

  const { rows } = await pool.query(
    `SELECT c.id, c.content, c.created_at, c.user_id,
            u.full_name, u.avatar_url
     FROM blog_comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.post_id = $1
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [postId]
  );
  return { comments: rows };
}

export async function addComment(postIdRaw: unknown, userId: number, contentRaw: unknown) {
  const postId = Number(postIdRaw);
  const rawContent = String(contentRaw ?? '').trim();

  if (!postId) throw { status: 400, message: 'Invalid post.' };
  if (rawContent.length < 2) throw { status: 422, message: 'Bình luận quá ngắn.' };
  if (rawContent.length > 2000) throw { status: 422, message: 'Bình luận quá dài (tối đa 2000 ký tự).' };

  const { filtered } = filterContent(rawContent);

  const r = await pool.query(
    `INSERT INTO blog_comments (post_id, user_id, content) VALUES ($1, $2, $3)
     RETURNING id, content, created_at`,
    [postId, userId, filtered]
  );
  const row = r.rows[0];
  const u = await pool.query('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId]);

  return {
    comment: { ...row, user_id: userId, full_name: u.rows[0]?.full_name, avatar_url: u.rows[0]?.avatar_url },
  };
}

export async function updateComment(commentIdRaw: unknown, userId: number, contentRaw: unknown) {
  const commentId = Number(commentIdRaw);
  const rawContent = String(contentRaw ?? '').trim();

  if (!commentId) throw { status: 400, message: 'Invalid comment.' };
  if (rawContent.length < 2) throw { status: 422, message: 'Bình luận quá ngắn.' };
  if (rawContent.length > 2000) throw { status: 422, message: 'Bình luận quá dài.' };

  const { filtered } = filterContent(rawContent);

  const r = await pool.query(
    `UPDATE blog_comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING id, content, created_at`,
    [filtered, commentId, userId]
  );

  if (r.rowCount === 0) throw { status: 403, message: 'Không có quyền sửa bình luận này.' };
  return { comment: r.rows[0] };
}

export async function deleteComment(commentIdRaw: unknown, userId: number) {
  const commentId = Number(commentIdRaw);
  if (!commentId) throw { status: 400, message: 'Invalid comment.' };

  const r = await pool.query(
    'DELETE FROM blog_comments WHERE id = $1 AND user_id = $2',
    [commentId, userId]
  );

  if (r.rowCount === 0) throw { status: 403, message: 'Không có quyền xóa bình luận này.' };
  return { success: true };
}

/* ────────── Likes ────────── */

export async function toggleLike(postIdRaw: unknown, userId: number) {
  const postId = Number(postIdRaw);
  if (!postId) throw { status: 400, message: 'Invalid post' };

  const existing = await pool.query(
    'SELECT id FROM blog_likes WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );

  let liked: boolean;
  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM blog_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    liked = false;
  } else {
    await pool.query(
      'INSERT INTO blog_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, userId]
    );
    liked = true;
  }

  const countR = await pool.query('SELECT COUNT(*)::int AS total FROM blog_likes WHERE post_id = $1', [postId]);
  const total = Number(countR.rows[0]?.total ?? 0);

  return { liked, total };
}

export async function getLikeStatus(postIdRaw: unknown, userId: number | null) {
  const postId = Number(postIdRaw);
  if (!postId) return { liked: false, total: 0 };

  let liked = false;
  if (userId) {
    const r = await pool.query('SELECT id FROM blog_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    liked = r.rows.length > 0;
  }
  const countR = await pool.query('SELECT COUNT(*)::int AS total FROM blog_likes WHERE post_id = $1', [postId]);
  return { liked, total: Number(countR.rows[0]?.total ?? 0) };
}
