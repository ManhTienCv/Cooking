import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton';
import { RevealStaggerItem } from '../../components/motion/ScrollReveal';
import type { BlogPostRow } from './types';

interface BlogListProps {
  isLoading: boolean;
  posts: BlogPostRow[];
  onClearFilter: () => void;
}

export default function BlogList({ isLoading, posts, onClearFilter }: BlogListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col h-full">
            <Skeleton className="h-4 w-24 mb-2 rounded-full" />
            <Skeleton className="h-6 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />
            <Skeleton className="h-3 w-1/2 mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="mb-4">
          <FileText className="h-16 w-16 text-gray-300 mx-auto" />
        </div>
        <p className="text-gray-500 mb-2">Chưa có bài viết nào trong danh mục này</p>
        <button 
          onClick={onClearFilter}
          className="mt-4 text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
        >
          Xem tất cả bài viết &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post, idx) => {
        const isPending = post.status === 'pending';
        return (
          <RevealStaggerItem key={post.id} index={idx} stagger={0.055} maxStaggerIndex={12} className="h-full">
            <Link
              to={`/blog/detail/${post.id}`}
              className={`relative rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow border flex flex-col h-full block ${
                isPending
                  ? 'border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70'
                  : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              {isPending && (
                <span className="absolute right-4 top-4 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  Đang chờ duyệt
                </span>
              )}
              <div className="text-sm text-yellow-600 dark:text-yellow-500 font-semibold mb-2">{post.category_name}</div>
              <h3 className="text-xl font-bold mb-3 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">{post.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-auto">
                By {post.author_name} - {post.created_at}
              </div>
            </Link>
          </RevealStaggerItem>
        );
      })}
    </div>
  );
}
