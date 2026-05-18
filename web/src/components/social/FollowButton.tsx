import { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';

interface FollowButtonProps {
  userId: number;
  initialFollowing: boolean;
  isSelf: boolean;
  size?: 'sm' | 'md';
  onChange?: (following: boolean) => void;
}

export default function FollowButton({
  userId,
  initialFollowing,
  isSelf,
  size = 'md',
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  if (isSelf) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ following: boolean }>(`/api/users/${userId}/follow`, {
        method: 'POST',
      });
      setFollowing(data.following);
      onChange?.(data.following);
      toast.success(data.following ? 'Đã theo dõi' : 'Đã bỏ theo dõi');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật theo dõi';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void toggle()}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition-all disabled:opacity-60 ${sizeClass} ${
        following
          ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
          : 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
      }`}
    >
      {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </button>
  );
}
