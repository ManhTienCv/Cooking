import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, Heart, MessageCircle, Share2, FileText } from 'lucide-react';
import AuthModal from '../../components/AuthModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import DOMPurify from 'dompurify';

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

export default function BlogDetail() {
  const { id } = useParams();
  const [isLiked, setIsLiked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments] = useState<{ id: number; full_name: string; avatar_url: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [me, data] = await Promise.all([
        apiJson<{ authenticated: boolean }>('/api/auth/me'),
        apiJson<{ post: BlogPost }>(`/api/blog/posts/${id}`),
      ]);
      setIsAuthenticated(Boolean(me.authenticated));
      setPost(data.post);
    } catch {
      setPost(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <main className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-32 mb-8 rounded-lg" />
          <div className="bg-white rounded-2xl shadow-lg p-8">
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

  if (!post) {
    return (
      <main className="min-h-screen pt-32 pb-20 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center text-center">
        <FileText className="h-24 w-24 text-gray-300 mb-6 drop-shadow-md" />
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Không tìm thấy bài viết</h2>
        <p className="text-gray-500 mb-8 max-w-md">Bài viết này có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link
          to="/blog"
          className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors inline-flex items-center space-x-2 font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại trang Blog</span>
        </Link>
      </main>
    );
  }

  const likeBase = Number(post.likes ?? 0);
  const html = DOMPurify.sanitize(String(post.content ?? ''), {
    USE_PROFILES: { html: true },
  });

  return (
    <main className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white/60 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Reveal y={12}>
            <Link
              to="/blog"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-black transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách</span>
            </Link>
          </Reveal>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <Reveal y={16}>
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{post.created_at ? String(post.created_at).slice(0, 10) : '—'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{post.author_name ?? '—'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Tag className="h-4 w-4" />
                <span>{post.category_name ?? '—'}</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">{post.title}</h1>
          </div>
          </Reveal>

          <Reveal y={18} delay={0.05}>
          <div className="relative">
            {post.image_url ? (
              <img src={post.image_url} alt={post.title} className="w-full h-64 md:h-96 object-cover" />
            ) : (
              <div className="w-full h-64 md:h-96 bg-gray-100 flex items-center justify-center text-gray-400">
                <FileText className="h-20 w-20" />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="bg-black/80 text-white px-3 py-1 rounded-full text-sm">
                {post.category_name ?? ''}
              </span>
            </div>
          </div>
          </Reveal>

          <Reveal y={16} delay={0.08}>
          <div className="p-8 prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          </Reveal>

          <Reveal y={14} delay={0.06}>
          <div className="px-8 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => {
                  if (!isAuthenticated) setIsAuthOpen(true);
                  else setIsLiked(!isLiked);
                }}
                className={`flex items-center space-x-2 transition-colors duration-300 ${isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likeBase + (isLiked ? 1 : 0)} Thích</span>
              </button>
              <a href="#comments" className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors duration-300">
                <MessageCircle className="h-5 w-5" />
                <span>{comments.length} Bình luận</span>
              </a>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-green-500 transition-colors duration-300">
                <Share2 className="h-5 w-5" />
                <span>Chia sẻ</span>
              </button>
            </div>
          </div>
          </Reveal>

          <Reveal y={16}>
          <div className="p-8 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-black mb-4">Về tác giả</h3>
            <div className="flex items-center space-x-4">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name ?? ''} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-black">{post.author_name ?? '—'}</h4>
                <p className="text-sm text-gray-600">{post.author_email ?? ''}</p>
              </div>
            </div>
          </div>
          </Reveal>

          <Reveal y={18}>
          <div id="comments" className="p-8 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-black mb-6">Bình luận ({comments.length})</h3>

            {isAuthenticated ? (
              <form className="mb-8" onSubmit={(e) => e.preventDefault()}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <textarea
                      rows={3}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-black focus:ring-0 transition-all duration-300"
                      placeholder="Viết bình luận của bạn..."
                    ></textarea>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        className="bg-black text-white px-6 py-2 rounded-full font-semibold hover:bg-gray-800 transition-all"
                      >
                        Gửi bình luận
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center mb-8">
                <p className="text-gray-600">
                  Vui lòng{' '}
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="text-yellow-600 font-semibold hover:underline"
                  >
                    đăng nhập
                  </button>{' '}
                  để bình luận.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-4 group">
                  <div className="flex-shrink-0">
                    <img src={comment.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <div className="bg-gray-50 rounded-2xl px-4 py-3 relative">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-black">{comment.full_name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">2 ngày trước</span>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </Reveal>
        </div>
      </article>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Reveal y={20}>
          <h2 className="text-2xl font-bold text-black mb-6">Bài viết liên quan</h2>
          <div className="text-center py-8 text-gray-500">Chưa có bài viết liên quan.</div>
        </Reveal>
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={load} />
    </main>
  );
}
