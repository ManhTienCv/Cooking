export interface BlogPostRow {
  id: number;
  title: string;
  excerpt?: string | null;
  image_url?: string | null;
  category_name?: string | null;
  created_at?: string | null;
  author_name?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface BlogCategory {
  id: number;
  name: string;
}

export const LEGACY_BLOG_CATEGORIES = [
  'Mẹo Vặt',
  'Review Nhà Hàng',
  'Dinh Dưỡng',
  'Văn Hóa Ẩm Thực',
  'Kỹ Thuật Nấu',
  'An toàn',
  'Healthy',
  'Kỹ thuật',
  'Văn hóa',
];
