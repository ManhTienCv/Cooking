export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  category_id: number;
  author_id: number;
  status: 'pending' | 'approved' | 'rejected';
  views: number;
  created_at: Date;
  updated_at: Date;
}

export interface BlogPostWithAuthor extends BlogPost {
  author_name: string;
  author_avatar: string | null;
  author_email?: string;
  category_name: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface BlogComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: Date;
  full_name: string;
  avatar_url: string | null;
}
