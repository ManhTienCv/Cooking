import { Link } from 'react-router-dom';
import { Camera, User, Mail } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { HeroEnter } from '../motion/ScrollReveal';
import type { ProfileUser, ProfileStats } from './types';

interface ProfileHeaderProps {
  isLoading: boolean;
  user: ProfileUser | null;
  stats: ProfileStats | null;
  userId?: number | null;
  followers?: number;
  following?: number;
}

function formatStatNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`.replace(/\.0M$/, 'M');
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`.replace(/\.0k$/, 'k');
  return String(Math.round(n));
}

export default function ProfileHeader({
  isLoading,
  user,
  stats,
  userId,
  followers = 0,
  following = 0,
}: ProfileHeaderProps) {
  return (
    <div className="relative pt-20 pb-6">
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {!isLoading && user ? (
          <HeroEnter>
            <div className="rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
                  <div className="group relative flex-shrink-0">
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg dark:border-slate-900 dark:bg-slate-800">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800">
                          <User className="h-10 w-10 text-gray-400 dark:text-slate-400" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-black p-1.5 text-white shadow-md transition-transform hover:scale-110 dark:bg-white dark:text-slate-950">
                      <Camera className="h-3.5 w-3.5" />
                      <input type="file" className="hidden" accept="image/*" />
                    </label>
                  </div>

                  <div className="flex-1 text-center sm:text-left pt-1 sm:pt-0 sm:pb-1">
                    <h1 className="text-2xl font-bold font-serif text-gray-900 dark:text-white leading-tight">{user.full_name}</h1>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-gray-500 dark:text-slate-400 text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{user.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-2 pb-1">
                    <div className="flex flex-wrap items-center justify-center gap-0 sm:justify-end">
                      <div className="px-4 text-center">
                        <div className="text-xl font-bold text-black dark:text-white leading-tight">{formatStatNumber(followers)}</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mt-0.5">Theo dõi</div>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
                      <div className="px-4 text-center">
                        <div className="text-xl font-bold text-black dark:text-white leading-tight">{formatStatNumber(following)}</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mt-0.5">Đang theo dõi</div>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
                      <div className="px-4 text-center">
                        <div className="text-xl font-bold text-black dark:text-white leading-tight">{formatStatNumber(stats?.recipe_count ?? 0)}</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mt-0.5">Công thức</div>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
                      <div className="px-4 text-center">
                        <div className="text-xl font-bold text-black dark:text-white leading-tight">{formatStatNumber(stats?.post_count ?? 0)}</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mt-0.5">Bài viết</div>
                      </div>
                    </div>
                    {userId && (
                      <Link
                        to={`/creator/${userId}`}
                        className="text-sm font-semibold text-amber-600 hover:underline dark:text-amber-400"
                      >
                        Xem trang công khai →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </HeroEnter>
        ) : (
          <div className="rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg dark:border-slate-900 dark:bg-slate-800">
                  <Skeleton className="h-full w-full rounded-full" />
                </div>
                <div className="flex-1 pt-1 sm:pt-0 text-center sm:text-left">
                  <Skeleton className="mx-auto sm:mx-0 mb-2 h-7 w-40" />
                  <Skeleton className="mx-auto sm:mx-0 h-4 w-48" />
                </div>
                <div className="flex items-center gap-0">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-5 text-center">
                      <Skeleton className="mx-auto mb-1 h-6 w-8" />
                      <Skeleton className="mx-auto h-3 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
