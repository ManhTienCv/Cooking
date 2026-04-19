-- PostgreSQL schema for cookingboy
-- Create database manually if needed:
--   CREATE DATABASE cookingboy;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  bio TEXT,
  reset_token VARCHAR(64),
  reset_token_expiry TIMESTAMP,
  pending_email VARCHAR(150),
  email_otp VARCHAR(6),
  email_otp_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(150) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quantrivien (
  "MaAD" SERIAL PRIMARY KEY,
  "HoTen" VARCHAR(100) NOT NULL,
  "SDT" VARCHAR(20),
  "Email" VARCHAR(100) NOT NULL UNIQUE,
  "MatKhau" VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  difficulty VARCHAR(20) DEFAULT 'Trung bình',
  cooking_time INT,
  servings INT,
  image_url VARCHAR(255),
  category_id INT NOT NULL REFERENCES recipe_categories(id) ON DELETE RESTRICT,
  author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  calories INT DEFAULT 0,
  protein INT DEFAULT 0,
  carbs INT DEFAULT 0,
  fat INT DEFAULT 0,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_views (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  likes INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  category_id INT NOT NULL REFERENCES blog_categories(id) ON DELETE RESTRICT,
  author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_likes (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_plans (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  diet_type VARCHAR(50),
  meal_count INT DEFAULT 0,
  target_calories INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_meals (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES health_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  recipe_id VARCHAR(50),
  recipe_name VARCHAR(255) NOT NULL,
  note TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  nutrition_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES health_plans(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity VARCHAR(100),
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipes_status_created ON recipes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created ON blog_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_plans_user_created ON health_plans(user_id, created_at DESC);

-- Bootstrap admin uses a plaintext password here; hash it before production:
--   npm --prefix api run migrate:admin-passwords
INSERT INTO quantrivien ("HoTen", "SDT", "Email", "MatKhau")
VALUES ('Super Admin', '0909123456', 'admin@gmail.com', '123456')
ON CONFLICT ("Email") DO NOTHING;
