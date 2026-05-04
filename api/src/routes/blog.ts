import { Router } from 'express';
import * as blogRepo from '../repos/blogRepo.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';
import { processImageBase64 } from '../lib/processImage.js';
import { filterContent } from '../lib/profanityFilter.js';
import { pool } from '../db/pool.js';

export const blogRouter = Router();

blogRouter.use(ensureCsrfToken);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

blogRouter.get('/categories', async (_req, res) => {
  const categories = await blogRepo.getCategories();
  res.json({ categories });
});

blogRouter.get('/posts/mine', requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const [posts, total] = await Promise.all([
    blogRepo.getPostsByAuthor(userId, limit, offset),
    blogRepo.countPostsByAuthor(userId),
  ]);
  res.json({ posts, total, limit, offset });
});

blogRouter.get('/posts/:id', async (req, res) => {
  const id = Number(req.params.id);
  const viewerId = req.session.userId ?? null;
  if (!id) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const post = await blogRepo.getPostById(id, viewerId);
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ post });
});

blogRouter.get('/posts', async (req, res) => {
  const search = req.query.q ? String(req.query.q).trim() || null : null;
  const category = req.query.category ? String(req.query.category) : null;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 12));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const viewerId = req.session.userId ?? null;
  const [posts, total] = await Promise.all([
    viewerId
      ? blogRepo.searchPostsWithViewer(search, category, viewerId, limit, offset)
      : blogRepo.searchPosts(search, category, limit, offset),
    viewerId
      ? blogRepo.countSearchPostsWithViewer(search, category, viewerId)
      : blogRepo.countSearchPosts(search, category),
  ]);
  res.json({ posts, total, limit, offset });
});

blogRouter.post('/posts', requireAuth, requireCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const title = String(req.body?.title ?? '').trim();
  const content = String(req.body?.content ?? '').trim();
  const excerptRaw = String(req.body?.excerpt ?? '').trim();
  const imageUrlRaw = String(req.body?.image_url ?? '').trim();
  const categoryName = String(req.body?.category_name ?? '').trim();
  let categoryId = Number(req.body?.category_id ?? 0);

  if (title.length < 3) {
    res.status(422).json({ success: false, message: 'Tiêu đề phải có ít nhất 3 ký tự.' });
    return;
  }

  if (content.length < 10) {
    res.status(422).json({ success: false, message: 'Nội dung bài viết quá ngắn (tối thiểu 10 ký tự).' });
    return;
  }

  if (!categoryId && categoryName) {
    categoryId = (await blogRepo.ensureCategoryExists(categoryName)) ?? 0;
  }

  if (!categoryId) {
    res.status(422).json({ success: false, message: 'Vui lòng chọn danh mục bài viết.' });
    return;
  }

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

  if (!id) {
    res.status(400).json({ success: false, message: 'Không thể tạo bài viết.' });
    return;
  }

  res.status(201).json({ success: true, id, status: 'pending' });
});
/* ────────── Comments ────────── */

/** Lấy danh sách bình luận của bài viết */
blogRouter.get('/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id);
  if (!postId) { res.status(400).json({ comments: [] }); return; }

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
  res.json({ comments: rows });
});

/** Đăng bình luận */
blogRouter.post('/posts/:id/comments', requireAuth, requireCsrf, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.session.userId!;
  const rawContent = String(req.body?.content ?? '').trim();

  if (!postId) { res.status(400).json({ success: false, message: 'Invalid post.' }); return; }
  if (rawContent.length < 2) { res.status(422).json({ success: false, message: 'Bình luận quá ngắn.' }); return; }
  if (rawContent.length > 2000) { res.status(422).json({ success: false, message: 'Bình luận quá dài (tối đa 2000 ký tự).' }); return; }

  const { filtered } = filterContent(rawContent);

  const r = await pool.query(
    `INSERT INTO blog_comments (post_id, user_id, content) VALUES ($1, $2, $3)
     RETURNING id, content, created_at`,
    [postId, userId, filtered]
  );
  const row = r.rows[0];
  const u = await pool.query('SELECT full_name, avatar_url FROM users WHERE id = $1', [userId]);

  res.status(201).json({
    success: true,
    comment: { ...row, user_id: userId, full_name: u.rows[0]?.full_name, avatar_url: u.rows[0]?.avatar_url },
  });
});

/** Sửa bình luận — chỉ chủ comment */
blogRouter.put('/posts/:postId/comments/:commentId', requireAuth, requireCsrf, async (req, res) => {
  const commentId = Number(req.params.commentId);
  const userId = req.session.userId!;
  const rawContent = String(req.body?.content ?? '').trim();

  if (!commentId) { res.status(400).json({ success: false, message: 'Invalid comment.' }); return; }
  if (rawContent.length < 2) { res.status(422).json({ success: false, message: 'Bình luận quá ngắn.' }); return; }
  if (rawContent.length > 2000) { res.status(422).json({ success: false, message: 'Bình luận quá dài.' }); return; }

  const { filtered } = filterContent(rawContent);

  const r = await pool.query(
    `UPDATE blog_comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING id, content, created_at`,
    [filtered, commentId, userId]
  );

  if (r.rowCount === 0) {
    res.status(403).json({ success: false, message: 'Không có quyền sửa bình luận này.' });
    return;
  }

  res.json({ success: true, comment: r.rows[0] });
});

/** Xóa bình luận — chỉ chủ comment */
blogRouter.delete('/posts/:postId/comments/:commentId', requireAuth, requireCsrf, async (req, res) => {
  const commentId = Number(req.params.commentId);
  const userId = req.session.userId!;

  if (!commentId) { res.status(400).json({ success: false }); return; }

  const r = await pool.query(
    'DELETE FROM blog_comments WHERE id = $1 AND user_id = $2',
    [commentId, userId]
  );

  if (r.rowCount === 0) {
    res.status(403).json({ success: false, message: 'Không có quyền xóa bình luận này.' });
    return;
  }

  res.json({ success: true });
});

/* ────────── Likes ────────── */

/** Toggle like trên bài viết */
blogRouter.post('/posts/:id/like', requireAuth, requireCsrf, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.session.userId!;
  if (!postId) { res.status(400).json({ success: false }); return; }

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

  res.json({ success: true, liked, total });
});

/** Check if user liked a post */
blogRouter.get('/posts/:id/like', async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.session.userId ?? null;
  if (!postId) { res.json({ liked: false, total: 0 }); return; }

  let liked = false;
  if (userId) {
    const r = await pool.query('SELECT id FROM blog_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    liked = r.rows.length > 0;
  }
  const countR = await pool.query('SELECT COUNT(*)::int AS total FROM blog_likes WHERE post_id = $1', [postId]);
  res.json({ liked, total: Number(countR.rows[0]?.total ?? 0) });
});


/* ────────── Edit Post ────────── */

blogRouter.put('/posts/:id', requireAuth, requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId!;
  if (!id) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }

  // Verify ownership
  const post = await blogRepo.getPostById(id, userId);
  if (!post || post.author_id !== userId) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bài viết này.' });
    return;
  }

  const title = req.body?.title != null ? String(req.body.title).trim() : undefined;
  const content = req.body?.content != null ? String(req.body.content).trim() : undefined;
  const imageUrlRaw = req.body?.image_url != null ? String(req.body.image_url).trim() : undefined;
  const categoryName = req.body?.category_name ? String(req.body.category_name).trim() : undefined;
  let categoryId = req.body?.category_id ? Number(req.body.category_id) : undefined;

  if (title !== undefined && title.length < 3) {
    res.status(422).json({ success: false, message: 'Tiêu đề phải có ít nhất 3 ký tự.' });
    return;
  }
  if (content !== undefined && content.length < 10) {
    res.status(422).json({ success: false, message: 'Nội dung bài viết quá ngắn (tối thiểu 10 ký tự).' });
    return;
  }

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

  if (!updated) {
    res.status(400).json({ success: false, message: 'Không thể cập nhật bài viết.' });
    return;
  }

  res.json({ success: true, message: 'Cập nhật bài viết thành công.' });
});

blogRouter.delete('/posts/:id', requireAuth, requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId ?? null;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  const post = await blogRepo.getPostById(id, userId);
  if (!post || post.author_id !== userId) return res.status(403).json({ error: 'Forbidden' });
  await blogRepo.deletePost(id);
  res.json({ success: true });
});
