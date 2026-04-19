import { useState, useEffect, useMemo } from 'react';
import { Search, X, Plus, FileText } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { Reveal, RevealStaggerItem } from '../../components/motion/ScrollReveal';

interface BlogPostRow {
  id: number;
  title: string;
  excerpt?: string | null;
  image_url?: string | null;
  category_name?: string | null;
  created_at?: string | null;
  author_name?: string | null;
}

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const categories = ['Tất cả', 'An toàn', 'Healthy', 'Kỹ thuật', 'Mẹo vặt', 'Văn hóa'];
  
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchKey = useMemo(
    () => `${searchQuery.trim()}|${selectedCategory}`,
    [searchQuery, selectedCategory]
  );

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        setIsLoading(true);
        try {
          const q = new URLSearchParams();
          if (searchQuery.trim()) q.set('q', searchQuery.trim());
          if (selectedCategory && selectedCategory !== 'Tất cả') q.set('category', selectedCategory);
          q.set('limit', '24');
          q.set('offset', '0');
          const data = await apiJson<{ posts: BlogPostRow[] }>(`/api/blog/posts?${q.toString()}`);
          if (!cancelled) setPosts(data.posts ?? []);
        } catch {
          if (!cancelled) setPosts([]);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, selectedCategory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreviewImage(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="bg-white/60 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Reveal className="text-center" y={18}>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">Diễn đàn Ẩm Thực</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Chia sẻ kiến thức, mẹo vặt và câu chuyện thú vị về ẩm thực Việt Nam
            </p>
            <p className="text-lg text-gray-500 mt-2">
              Hiện có <strong className="text-black">{posts.length}</strong> bài viết
            </p>
          </Reveal>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative flex-1 max-w-md">
              <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                <Search className="h-5 w-5" />
              </button>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài viết..." 
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-full focus:border-black focus:ring-0 transition-all duration-300 bg-white/80" 
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${selectedCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <button onClick={() => setIsModalOpen(true)} className="bg-yellow-400 text-black px-6 py-3 rounded-full font-semibold hover:bg-yellow-300 transition-all duration-300 inline-flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Đăng bài mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" key={searchKey}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col h-full">
                <Skeleton className="h-4 w-24 mb-2 rounded-full" />
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                <Skeleton className="h-3 w-1/2 mt-auto" />
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="mb-4">
                <FileText className="h-16 w-16 text-gray-300 mx-auto" />
              </div>
              <p className="text-gray-500 mb-2">Chưa có bài viết nào trong danh mục này</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tất cả');
                }}
                className="mt-4 text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
              >
                Xem tất cả bài viết →
              </button>
            </div>
          ) : (
            posts.map((post, idx) => (
              <RevealStaggerItem key={post.id} index={idx} stagger={0.055} maxStaggerIndex={12} className="h-full">
                <Link
                  to={`/blog/detail/${post.id}`}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100 flex flex-col h-full hover:border-black block"
                >
                  <div className="text-sm text-yellow-600 font-semibold mb-2">{post.category_name}</div>
                  <h3 className="text-xl font-bold mb-3 hover:text-yellow-600 transition-colors">{post.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                  <div className="text-xs text-gray-400 mt-auto">
                    By {post.author_name} - {post.created_at}
                  </div>
                </Link>
              </RevealStaggerItem>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-2xl font-bold text-black">Tạo Bài Viết Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề bài viết *</label>
                  <input type="text" required className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0" placeholder="VD: 10 mẹo nấu ăn cần biết" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0">
                    {categories.filter(c => c !== 'Tất cả').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh đại diện</label>
                  <input type="file" onChange={handleImageChange} accept="image/*" className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0" required />
                  {previewImage && (
                    <div className="mt-2 text-center">
                      <img src={previewImage} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung bài viết *</label>
                  <textarea required rows={10} className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:border-black focus:ring-0 font-mono text-sm" placeholder="Viết nội dung bài viết của bạn tại đây..."></textarea>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors">Đăng bài viết</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors">Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
