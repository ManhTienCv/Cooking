export interface User {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserStats {
  recipe_count: number;
  post_count: number;
  recipe_views_sum: number;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: Partial<User>;
  captchaRequired?: boolean;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password_hash: string;
  otp_hash: string;
  expires_at: Date;
}
