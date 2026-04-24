import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { apiJson } from '../../lib/api';
import { Reveal } from '../../components/motion/ScrollReveal';
import AuthModal from '../../components/AuthModal';

import type { BlogPostRow, BlogCategory } from '../../components/blog/types';
import { LEGACY_BLOG_CATEGORIES } from '../../components/blog/types';
import { MOCK_BLOG_POSTS } from '../../lib/mockData';
import BlogFilterBar from '../../components/blog/BlogFilterBar';
import BlogList from '../../components/blog/BlogList';
import CreatePostModal from '../../components/blog/CreatePostModal';

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '8px';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isModalOpen]);

  const [categoryOptions, setCategoryOptions] = useState<BlogCategory[]>([]);
  const categories = useMemo(() => {
    const dbNames = categoryOptions.map((c) => c.name);
    const allNames = Array.from(new Set([...LEGACY_BLOG_CATEGORIES, ...dbNames]));
    return ['Tất cả', ...allNames];
  }, [categoryOptions]);
  
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const modalCategoryOptions = useMemo(
    () =>
      categoryOptions.length
        ? categoryOptions.map((c) => ({ value: String(c.id), label: c.name, id: c.id, name: c.name }))
        : LEGACY_BLOG_CATEGORIES.map((name) => ({ value: `name:${name}`, label: name, id: 0, name })),
    [categoryOptions]
  );

  const loadPosts = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }
    try {
      const q = new URLSearchParams();
      if (searchQuery.trim()) q.set('q', searchQuery.trim());
      if (selectedCategory && selectedCategory !== 'Tất cả') q.set('category', selectedCategory);
      q.set('limit', '24');
      q.set('offset', '0');
      const data = await apiJson<{ posts: BlogPostRow[] }>(`/api/blog/posts?${q.toString()}`);
      
      const realPosts = data.posts ?? [];
      const filteredMocks = MOCK_BLOG_POSTS.filter(p => {
        const matchSearch = searchQuery ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        const matchCat = (selectedCategory && selectedCategory !== 'Tất cả') ? p.category_name === selectedCategory : true;
        return matchSearch && matchCat;
      });
      setPosts([...realPosts, ...filteredMocks]);
    } catch {
      const filteredMocks = MOCK_BLOG_POSTS.filter(p => {
        const matchSearch = searchQuery ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        const matchCat = (selectedCategory && selectedCategory !== 'Tất cả') ? p.category_name === selectedCategory : true;
        return matchSearch && matchCat;
      });
      setPosts(filteredMocks);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [searchQuery, selectedCategory, hasLoadedOnce]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const categoriesData = await apiJson<{ categories: BlogCategory[] }>('/api/blog/categories');
        if (!cancelled) {
          setCategoryOptions(categoriesData.categories ?? []);
        }
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        if (cancelled) return;
        await loadPosts();
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loadPosts]);

  const openCreateModal = async () => {
    try {
      const me = await apiJson<{ authenticated?: boolean }>('/api/auth/me');
      if (!me.authenticated) {
        setIsAuthOpen(true);
        return;
      }
      setIsModalOpen(true);
    } catch {
      setIsAuthOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-slate-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Reveal className="text-center" y={18}>
            <h1 className="text-4xl md:text-5xl font-serif italic font-black text-black dark:text-white mb-4">Diễn đàn Ẩm Thực</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Chia sẻ kiến thức, mẹo vặt và câu chuyện thú vị về ẩm thực Việt Nam
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
              Hiện có <strong className="text-black dark:text-white">{posts.length}</strong> bài viết
            </p>
          </Reveal>
        </div>
      </div>

      <BlogFilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row items-center justify-center gap-4">
          <button
            onClick={openCreateModal}
            className="bg-yellow-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-300 transition-all duration-300 inline-flex items-center space-x-2 whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            <span>Đăng bài</span>
          </button>
          <div className="relative w-full max-w-md">
            <button
              type="button"
              title="Tìm kiếm bài viết"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300 bg-white dark:bg-slate-800 text-black dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                title="Xóa từ khóa tìm kiếm"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <BlogList 
          isLoading={isLoading} 
          posts={posts} 
          onClearFilter={() => {
            setSearchQuery('');
            setSelectedCategory('Tất cả');
          }} 
        />
      </div>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadPosts}
        categoryOptions={categoryOptions}
        modalCategoryOptions={modalCategoryOptions}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={async () => {
          setIsAuthOpen(false);
          setIsModalOpen(true);
          await loadPosts();
        }}
      />
    </div>
  );
}
