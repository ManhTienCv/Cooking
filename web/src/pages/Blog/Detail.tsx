import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, Heart, MessageCircle, Share2, FileText, Send, Copy, Check, Lock } from 'lucide-react';
import AuthModal from '../../components/AuthModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import DOMPurify from 'dompurify';
import ImageWithFallback from '../../lib/ImageWithFallback';
import { AUTH_CHANGE_EVENT } from '../../lib/authEvents';

interface BlogPost {
  id: number;
  title: string;
  author_name?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  content?: string | null;
  likes?: number | string | null;
  author_avatar?: string | null;
  author_email?: string | null;
  created_at?: string | null;
}

interface Comment {
  id: number;
  user_id?: number;
  full_name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function BlogDetail() {
  const { id } = useParams();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Edit comment
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentLoading, setEditCommentLoading] = useState(false);

  // Share
  const [copied, setCopied] = useState(false);

  // Sticky bar visibility
  const [showSticky, setShowSticky] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    // Fetch auth status immediately regardless of mock or real post
    try {
      const me = await apiJson<{ authenticated: boolean; user?: { id: number } }>('/api/auth/me');
      setIsAuthenticated(Boolean(me.authenticated));
      if (me.authenticated && me.user) {
        setCurrentUserId(me.user.id);
      }
      if (!me.authenticated) { setIsLoading(false); return; }
    } catch {
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setIsLoading(false);
      return;
    }

    try {
      const [data, likeData, commentData] = await Promise.all([
        apiJson<{ post: BlogPost }>(`/api/blog/posts/${id}`),
        apiJson<{ liked: boolean; total: number }>(`/api/blog/posts/${id}/like`),
        apiJson<{ comments: Comment[] }>(`/api/blog/posts/${id}/comments`),
      ]);
      setPost(data.post);
      setIsLiked(likeData.liked);
      setLikeCount(likeData.total);
      setComments(commentData.comments ?? []);
    } catch {
      setPost(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void load();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChanged);
  }, [load]);

  // Sticky bar on scroll
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Like toggle â€” Optimistic UI
  const handleLike = async () => {
    if (!isAuthenticated) { setIsAuthOpen(true); return; }
    // Optimistic
    setIsLiked(prev => !prev);
    setLikeCount(prev => prev + (isLiked ? -1 : 1));
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    // Skip API for mock posts
    if (Number(id) < 0) return;

    try {
      const data = await apiJson<{ liked: boolean; total: number }>(`/api/blog/posts/${id}/like`, { method: 'POST' });
      setIsLiked(data.liked);
      setLikeCount(data.total);
    } catch {
      // Revert on error
      setIsLiked(prev => !prev);
      setLikeCount(prev => prev + (isLiked ? 1 : -1));
    }
  };

  // Submit comment
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;
    if (!isAuthenticated) { setIsAuthOpen(true); return; }

    // Mock post handling
    if (Number(id) < 0) {
      const newComment: Comment = {
        id: Date.now(),
        content: commentText,
        created_at: new Date().toISOString(),
        full_name: 'Báº¡n',
        avatar_url: null,
      };
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      return;
    }

    setCommentLoading(true);
    try {
      const data = await apiJson<{ success: boolean; comment: Comment }>(`/api/blog/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText }),
      });
      if (data.success && data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setCommentText('');
      }
    } catch { /* ignore */ }
    finally { setCommentLoading(false); }
  };

  // Edit comment
  const handleStartEditComment = (c: Comment) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.content);
  };

  const handleSaveEditComment = async (commentId: number) => {
    if (!editCommentText.trim() || editCommentLoading) return;
    setEditCommentLoading(true);
    try {
      const data = await apiJson<{ success: boolean; comment: Comment }>(`/api/blog/posts/${id}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editCommentText })
      });
      if (data.success && data.comment) {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: data.comment.content } : c));
        setEditingCommentId(null);
      }
    } catch {
      alert('Không thể sửa bình luận.');
    } finally {
      setEditCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
      await apiJson(`/api/blog/posts/${id}/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      alert('Không thể xóa bình luận.');
    }
  };

  // Share
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const scrollToComments = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-32 mb-8 rounded-lg" />
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
            <Skeleton className="h-6 w-1/3 mb-4 rounded-full" />
            <Skeleton className="h-12 w-full mb-6 rounded-lg" />
            <Skeleton className="h-64 md:h-96 w-full mb-8 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Auth gate — must login to view blog details
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-10 max-w-md mx-auto border border-gray-100 dark:border-slate-700">
          <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Cần đăng nhập</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Bạn cần đăng nhập để xem chi tiết bài viết.</p>
          <button onClick={() => setIsAuthOpen(true)} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity font-semibold mb-3 w-full">Đăng nhập</button>
          <Link to="/blog" className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors">← Quay lại trang Blog</Link>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center text-center">
        <FileText className="h-24 w-24 text-gray-300 dark:text-slate-600 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Không tìm thấy bài viết</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Bài viết này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link
          to="/blog"
          className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-full hover:opacity-80 transition-opacity inline-flex items-center space-x-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại trang Blog</span>
        </Link>
      </main>
    );
  }

  const html = DOMPurify.sanitize(String(post.content ?? ''), { USE_PROFILES: { html: true } });

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">

      {/* â”€â”€ Sticky Action Bar (Portaled to body to escape transform context) â”€â”€ */}
      {createPortal(
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl border border-gray-200/50 dark:border-slate-700/50 px-5 py-3">
            <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 ${isLiked ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'}`}>
              <Heart className={`h-4 w-4 transition-transform duration-300 ${likeAnimating ? 'scale-125' : ''} ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
            <button onClick={scrollToComments} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-300">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{comments.length}</span>
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700" />
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-300">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              <span className="text-sm font-medium">{copied ? 'Đã copy' : 'Chia sẻ'}</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Top Back Nav Button - Moved inside Hero Banner */}
      {/* <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Reveal y={12}>
            <Link to="/blog" className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách</span>
            </Link>
          </Reveal>
        </div>
      </div> */}

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-slate-700">

          {/* â”€â”€ Hero Image â”€â”€ */}
          <Reveal y={16}>
            <div className="relative overflow-hidden">
              {/* Back Button overlay */}
              <div className="absolute top-4 left-4 z-10">
                <Link to="/blog" className="bg-white/80 backdrop-blur-md text-black px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center text-sm font-medium shadow-sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại
                </Link>
              </div>
              
              <ImageWithFallback src={post.image_url || '/assets/images/vietnam1.jpg'} alt={post.title} className="block w-full h-72 md:h-[28rem] object-cover scale-105 hover:scale-100 transition-transform duration-[3000ms]" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {post.category_name && (
                    <span className="bg-amber-400/90 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {post.category_name}
                    </span>
                  )}
                  {post.created_at && (
                    <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {String(post.created_at).slice(0, 10)}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-black text-white leading-tight drop-shadow-lg">{post.title}</h1>
              </div>
            </div>
          </Reveal>

          {/* â”€â”€ Author bar â”€â”€ */}
          <Reveal y={14} delay={0.04}>
            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {post.author_avatar ? (
                  <ImageWithFallback src={post.author_avatar} alt={post.author_name ?? ''} className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">{post.author_name ?? '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{post.author_email ?? 'Tác giả'}</p>
                </div>
              </div>

              {/* Inline action buttons */}
              <div className="flex items-center gap-4">
                <button onClick={handleLike} className={`flex items-center gap-1.5 transition-all duration-300 ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}>
                  <Heart className={`h-5 w-5 transition-transform duration-300 ${likeAnimating ? 'scale-125' : ''} ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{likeCount}</span>
                </button>
                <button onClick={scrollToComments} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{comments.length}</span>
                </button>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors">
                  {copied ? <Copy className="h-5 w-5 text-emerald-500" /> : <Share2 className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </Reveal>

          {/* â”€â”€ Content â”€â”€ */}
          <Reveal y={16} delay={0.08}>
            <div className="px-6 md:px-8 py-8 prose prose-lg dark:prose-invert max-w-none
                          prose-headings:font-serif prose-headings:text-black dark:prose-headings:text-white
                          prose-a:text-amber-600 dark:prose-a:text-amber-400
                          prose-img:rounded-xl"
                 dangerouslySetInnerHTML={{ __html: html }} />
          </Reveal>

          {/* â”€â”€ Tags / metadata â”€â”€ */}
          <Reveal y={14}>
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                {post.category_name ?? 'Chưa phân loại'}
              </span>
            </div>
          </Reveal>

          {/* â”€â”€ Comments section â”€â”€ */}
          <Reveal y={18}>
            <div id="comments-section" className="px-6 md:px-8 py-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-black dark:text-white mb-6 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-amber-500" />
                Bình luận ({comments.length})
              </h3>

              {/* Comment form */}
              {isAuthenticated ? (
                <form className="mb-8" onSubmit={handleComment}>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-grow relative">
                      <textarea
                        ref={commentRef}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        rows={2}
                        required
                        maxLength={2000}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-black dark:text-white rounded-xl focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all text-sm resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="Viết bình luận..."
                      />
                      <button
                        type="submit"
                        disabled={commentLoading || !commentText.trim()}
                        className="absolute right-3 bottom-3 p-1.5 rounded-full bg-amber-400 text-black hover:bg-amber-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="bg-white dark:bg-slate-700/50 rounded-xl p-5 text-center mb-8 border border-gray-100 dark:border-slate-600">
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Vui lòng{' '}
                    <button type="button" onClick={() => setIsAuthOpen(true)} className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                      đăng nhập
                    </button>{' '}
                    để bình luận.
                  </p>
                </div>
              )}

              {/* Comment list */}
              <div className="space-y-4">
                {comments.length === 0 && (
                  <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 group">
                    <div className="flex-shrink-0 pt-0.5">
                      {c.avatar_url ? (
                        <ImageWithFallback src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="bg-white dark:bg-slate-700 rounded-xl px-4 py-3 border border-gray-100 dark:border-slate-600 group-hover:border-gray-200 dark:group-hover:border-slate-500 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-black dark:text-white">{c.full_name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(c.created_at)}</span>
                        </div>
                        {editingCommentId === c.id ? (
                          <div className="mt-2">
                            <textarea
                              className="w-full text-sm p-2 border border-amber-300 dark:border-amber-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 bg-transparent dark:text-white"
                              rows={2}
                              value={editCommentText}
                              onChange={e => setEditCommentText(e.target.value)}
                              disabled={editCommentLoading}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingCommentId(null)} className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-500 transition-colors">Hủy</button>
                              <button onClick={() => handleSaveEditComment(c.id)} disabled={editCommentLoading} className="text-xs px-3 py-1 rounded bg-amber-500 text-black hover:bg-amber-600 transition-colors disabled:opacity-50">Lưu</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        )}
                      </div>
                      
                      {/* Comment Actions (Edit/Delete) */}
                      {!editingCommentId && currentUserId && c.user_id === currentUserId && (
                        <div className="flex gap-3 mt-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleStartEditComment(c)} className="text-[11px] font-medium text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400">
                            Sửa
                          </button>
                          <button onClick={() => handleDeleteComment(c.id)} className="text-[11px] font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </article>

      {/* Related posts placeholder */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal y={20}>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Bài viết liên quan</h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Chưa có bài viết liên quan.</div>
        </Reveal>
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
