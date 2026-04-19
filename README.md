<div align="center">

  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="CookingBoy" width="90" height="90">

  # 🍳 CookingBoy

  **Nền tảng quản lý, chia sẻ công thức ẩm thực và xây dựng lối sống lành mạnh**

  [![React 19](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge)](#tech-stack)
  [![Vite 8](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white&style=for-the-badge)](#tech-stack)
  [![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=nodedotjs&logoColor=white&style=for-the-badge)](#tech-stack)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](#tech-stack)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](#tech-stack)
  [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white&style=for-the-badge)](#deployment)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](#tech-stack)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

  <br>

  [Tính năng](#-tính-năng-nổi-bật) · [Kiến trúc](#-kiến-trúc-hệ-thống) · [Cài đặt nhanh](#-cài-đặt-nhanh) · [API Reference](#-api-reference) · [Tài liệu](#-tài-liệu-hướng-dẫn)

</div>

---

## 📖 Giới thiệu

**CookingBoy** không đơn thuần chỉ là một ứng dụng lưu trữ công thức nấu ăn. Đây là một **nền tảng ẩm thực số hoàn chỉnh** được thiết kế tỉ mỉ — nơi kết nối những người đam mê ẩm thực, chia sẻ kiến thức về sức khỏe, dinh dưỡng và cùng nhau khám phá hành trình từ bữa ăn cơ bản đến chuẩn nhà hàng.

Được xây dựng với kiến trúc **Client–Server tách biệt hoàn toàn**, CookingBoy hướng tới trải nghiệm mượt mà, bảo mật cao và dễ dàng mở rộng trong tương lai.

### 🎯 Vì sao chọn CookingBoy?

| Tiêu chí | Mô tả |
| :--- | :--- |
| 🏗️ **Kiến trúc hiện đại** | SPA với React 19 + Express 5, tách biệt Frontend & Backend, giao tiếp qua RESTful API |
| 🔒 **Bảo mật cấp doanh nghiệp** | OTP Email, ReCaptcha v2, CSRF Token, Rate Limiting, bcrypt, Helmet.js |
| ⚡ **Hiệu năng cao** | Vite 8 (HMR <50ms), Framer Motion page transitions, Lazy loading |
| 📱 **Responsive hoàn hảo** | TailwindCSS 4.2 utility-first, tương thích mọi thiết bị từ mobile → desktop |
| 🐳 **Production-Ready** | Docker Compose one-command deploy, Nginx reverse proxy, Health checks |

---

## ✨ Tính năng nổi bật

<table>
  <tr>
    <td width="50%">

### 🔐 Xác thực & Bảo mật
- Đăng ký bằng **OTP gửi qua Email** thực tế (Nodemailer SMTP)
- Cơ chế **chống Brute-force** với Rate Limiting đa tầng
- **ReCaptcha v2** tự động kích hoạt sau nhiều lần đăng nhập sai
- Quản lý phiên làm việc **Session + Cookie** bảo mật
- Mã hóa mật khẩu với **bcrypt** (cost factor 12)
- **CSRF Protection** cho mọi request thay đổi dữ liệu
- **Helmet.js** bảo vệ HTTP headers

  </td>
  <td width="50%">

### 🥘 Công thức ẩm thực
- Khám phá & tìm kiếm công thức theo **danh mục, độ khó, thời gian**
- Xem **chi tiết nguyên liệu, hướng dẫn** từng bước
- Hiển thị **thông tin dinh dưỡng** (Calories, Protein, Carbs, Fat)
- Hệ thống **lưu công thức yêu thích** cá nhân
- Bộ đếm **lượt xem** thông minh (unique per user)
- Trạng thái duyệt bài: `pending` → `approved` / `rejected`

  </td>
  </tr>
  <tr>
    <td width="50%">

### 🥗 Sức khỏe & Dinh dưỡng
- Tạo **kế hoạch ăn uống** cá nhân hóa theo ngày
- Quản lý **thực đơn bữa ăn** (sáng / trưa / tối / snack)
- Theo dõi **mục tiêu calories** hàng ngày
- **Danh sách mua sắm** tự động từ kế hoạch dinh dưỡng
- Gợi ý AI thông minh (tích hợp **Gemini API**)
- Lưu trữ **thông tin dinh dưỡng** chi tiết dạng JSONB

  </td>
  <td width="50%">

### ✍️ Blog & Cộng đồng
- Chia sẻ **bài viết, mẹo nhà bếp** từ cộng đồng
- Tương tác **thích** và **bình luận** theo bài viết
- Phân loại theo **danh mục blog** linh hoạt
- Hệ thống **kiểm duyệt nội dung** trước khi hiển thị
- Giao diện **chi tiết bài viết** với typography đẹp mắt

  </td>
  </tr>
  <tr>
    <td width="50%">

### ⚙️ Admin Dashboard
- **Đăng nhập riêng biệt** cho quản trị viên (`/admin/login`)
- **Kiểm duyệt** công thức & bài viết từ người dùng
- **Quản lý thành viên** — xem, sửa, xóa tài khoản
- **Thống kê tổng quan** hoạt động toàn hệ thống
- Bảo vệ bằng middleware **requireAdmin**

  </td>
  <td width="50%">

### 🎨 Trải nghiệm người dùng
- **Page Transitions** mượt mà với Framer Motion
- **Scroll Reveal** animation cho từng section
- **Skeleton Loading** trạng thái chờ dữ liệu
- Hỗ trợ **Reduced Motion** cho khả năng tiếp cận
- **Lucide React** icon system nhất quán
- **DOMPurify** chống XSS trong nội dung HTML

  </td>
  </tr>
</table>

---

## 🏛 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                              │
│                                                                        │
│   React 19 · Vite 8 · TailwindCSS 4 · Framer Motion · React Router 7  │
│                                                                        │
│   ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────────┐  │
│   │   Home   │  │ Recipes  │  │  Blog  │  │ Health │  │   Admin    │  │
│   └──────────┘  └──────────┘  └────────┘  └────────┘  └────────────┘  │
│                         │                                              │
│                   RESTful API (fetch)                                   │
└─────────────────────────┼──────────────────────────────────────────────┘
                          │  HTTPS / JSON
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js + Express 5)                         │
│                                                                        │
│   ┌─── Middleware Layer ────────────────────────────────────────────┐   │
│   │  Helmet · CORS · CSRF · RateLimit · Session · requireAuth      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌─── Route Layer ────────────────────────────────────────────────┐   │
│   │  /api/auth · /api/recipes · /api/blog · /api/health · /api/admin│  │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌─── Service Layer ──────────────────────────────────────────────┐   │
│   │  mailService · aiService · mealPlanHandler                      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                          │                                             │
│                     pg (node-postgres)                                  │
└──────────────────────────┼─────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL 16)                             │
│                                                                        │
│   users · pending_registrations · quantrivien · recipes                │
│   recipe_categories · recipe_views · saved_recipes                     │
│   blog_categories · blog_posts · blog_likes · blog_comments           │
│   health_plans · plan_meals · shopping_items · feedback                │
│                                                                        │
│              Indexes · Foreign Keys · JSONB · Constraints              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

<h2 id="tech-stack">🛠 Công nghệ sử dụng</h2>

### 🖥️ Frontend

| Công nghệ | Phiên bản | Vai trò |
| :--- | :---: | :--- |
| **React** | `19.2` | UI Library — Component-based SPA |
| **Vite** | `8.0` | Build tool — HMR cực nhanh, ESModules native |
| **TypeScript** | `6.0` | Static typing — giảm bug, tăng DX |
| **TailwindCSS** | `4.2` | Utility-first CSS framework |
| **Framer Motion** | `12.38` | Page transitions & scroll animations |
| **React Router** | `7.14` | Client-side routing, nested routes |
| **Lucide React** | `1.8` | Icon system SVG nhất quán |
| **DOMPurify** | `3.4` | XSS sanitization cho HTML content |
| **ReCaptcha** | `3.1` | Google ReCaptcha v2 integration |

### ⚙️ Backend

| Công nghệ | Phiên bản | Vai trò |
| :--- | :---: | :--- |
| **Node.js** | LTS | Runtime — non-blocking I/O |
| **Express** | `5.1` | Web framework — routing, middleware |
| **TypeScript** | `6.0` | Type safety toàn bộ server |
| **PostgreSQL** | `16` | Relational DB — ACID compliance |
| **node-postgres (pg)** | `8.16` | PostgreSQL client cho Node.js |
| **bcryptjs** | `3.0` | Mã hóa mật khẩu (one-way hash) |
| **Helmet** | `8.1` | Bảo vệ HTTP headers |
| **express-rate-limit** | `8.3` | Chống brute-force & DDoS |
| **Nodemailer** | `8.0` | Gửi email OTP qua SMTP |
| **cookie-parser** | `1.4` | Parse & quản lý cookies |
| **tsx** | `4.21` | Dev runner — watch mode TypeScript |

### 🐳 DevOps & Deployment

| Công nghệ | Vai trò |
| :--- | :--- |
| **Docker Compose** | Orchestrate multi-container (db + api + web) |
| **Nginx** | Reverse proxy, static file serving, SSL termination |
| **PostgreSQL Alpine** | Lightweight production database image |
| **Health Checks** | Tự động kiểm tra sức khỏe từng container |
| **ESLint** | Code quality & consistent style enforcement |

---

## 🗄️ Cơ sở dữ liệu

Hệ thống sử dụng **15 bảng** quan hệ với ràng buộc chặt chẽ:

```
┌──────────────────┐       ┌──────────────────────┐
│      users       │       │ pending_registrations │
│──────────────────│       │──────────────────────│
│ id (PK)          │       │ email (PK)           │
│ full_name        │       │ full_name            │
│ email (UNIQUE)   │       │ password_hash        │
│ password_hash    │       │ otp_hash             │
│ avatar_url       │       │ expires_at           │
│ bio              │       └──────────────────────┘
│ reset_token      │
│ email_otp        │       ┌──────────────────────┐
│ created_at       │       │    quantrivien       │
└──────┬───────────┘       │──────────────────────│
       │                   │ MaAD (PK)            │
       │ 1:N               │ HoTen, SDT, Email    │
       │                   │ MatKhau              │
       ▼                   └──────────────────────┘
┌──────────────────┐
│     recipes      │──── N:1 ───► recipe_categories
│──────────────────│
│ id (PK)          │◄─── 1:N ───┐
│ title            │            │
│ ingredients      │     ┌──────┴──────────┐
│ instructions     │     │  recipe_views   │
│ difficulty       │     │  saved_recipes  │
│ cooking_time     │     └─────────────────┘
│ calories/protein │
│ status           │
│ is_featured      │
└──────────────────┘

┌──────────────────┐
│   blog_posts     │──── N:1 ───► blog_categories
│──────────────────│
│ id (PK)          │◄─── 1:N ───┐
│ title, content   │            │
│ excerpt          │     ┌──────┴──────────┐
│ likes, status    │     │  blog_likes     │
└──────────────────┘     │  blog_comments  │
                         └─────────────────┘

┌──────────────────┐
│  health_plans    │◄─── 1:N ───┐
│──────────────────│            │
│ diet_type        │     ┌──────┴──────────┐
│ target_calories  │     │  plan_meals     │
│ start/end_date   │     │  shopping_items │
└──────────────────┘     └─────────────────┘

┌──────────────────┐
│    feedback      │ ← Liên hệ / phản hồi từ người dùng
└──────────────────┘
```

> **Optimization:** Các chỉ mục composite (`idx_recipes_status_created`, `idx_blog_posts_status_created`, `idx_health_plans_user_created`) được tạo sẵn để tối ưu truy vấn phân trang.

---

## 🔌 API Reference

Tất cả API endpoints đều có prefix `/api` và trả về JSON.

### 🔑 Authentication (`/api/auth`)

| Method | Endpoint | Mô tả | Bảo vệ |
| :---: | :--- | :--- | :---: |
| `POST` | `/register/send-otp` | Gửi OTP đăng ký đến email | Rate Limit |
| `POST` | `/register/verify-otp` | Xác thực OTP & tạo tài khoản | Rate Limit |
| `POST` | `/login` | Đăng nhập (+ ReCaptcha nếu fail nhiều lần) | Rate Limit |
| `POST` | `/logout` | Đăng xuất, hủy session | Auth |
| `GET` | `/me` | Lấy thông tin user hiện tại | Auth |
| `POST` | `/forgot-password` | Gửi OTP reset mật khẩu | Rate Limit |
| `POST` | `/reset-password` | Đổi mật khẩu bằng OTP | Rate Limit |

### 🥘 Recipes (`/api/recipes`)

| Method | Endpoint | Mô tả | Bảo vệ |
| :---: | :--- | :--- | :---: |
| `GET` | `/recipes` | Danh sách công thức (lọc, phân trang) | Public |
| `GET` | `/recipes/:id` | Chi tiết công thức + tăng lượt xem | Public |
| `POST` | `/recipes` | Tạo công thức mới | Auth |
| `POST` | `/recipes/:id/save` | Lưu / bỏ lưu công thức | Auth |

### ✍️ Blog (`/api/blog`)

| Method | Endpoint | Mô tả | Bảo vệ |
| :---: | :--- | :--- | :---: |
| `GET` | `/blog` | Danh sách bài viết | Public |
| `GET` | `/blog/:id` | Chi tiết bài viết | Public |
| `POST` | `/blog/:id/like` | Thích / bỏ thích bài viết | Auth |
| `POST` | `/blog/:id/comment` | Thêm bình luận | Auth |

### 🥗 Health (`/api/health`)

| Method | Endpoint | Mô tả | Bảo vệ |
| :---: | :--- | :--- | :---: |
| `GET` | `/health/plans` | Danh sách kế hoạch dinh dưỡng | Auth |
| `POST` | `/health/plans` | Tạo kế hoạch mới | Auth |
| `PUT` | `/health/plans/:id` | Cập nhật kế hoạch | Auth |
| `DELETE` | `/health/plans/:id` | Xóa kế hoạch | Auth |
| `POST` | `/health/ai/suggest` | Gợi ý AI thực đơn | Auth |

### ⚙️ Admin (`/api/admin`)

| Method | Endpoint | Mô tả | Bảo vệ |
| :---: | :--- | :--- | :---: |
| `POST` | `/admin/login` | Đăng nhập quản trị | Rate Limit |
| `GET` | `/admin/dashboard` | Thống kê tổng quan | Admin |
| `GET` | `/admin/users` | Danh sách người dùng | Admin |
| `PUT` | `/admin/recipes/:id/status` | Duyệt / từ chối công thức | Admin |
| `PUT` | `/admin/blog/:id/status` | Duyệt / từ chối bài viết | Admin |

---

## 🛡️ Bảo mật

CookingBoy triển khai mô hình bảo mật **nhiều lớp (Defense-in-Depth)**:

```
                    ┌────────────────────────────────┐
           Layer 1  │        Helmet.js               │  HTTP Security Headers
                    │  X-Frame · CSP · HSTS · noSniff│
                    └────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────────┐
           Layer 2  │      Rate Limiting             │  Chống Brute-force & DDoS
                    │  Login: 12/15min               │
                    │  Register: 8/1h                │
                    │  OTP: 10/1h                    │
                    └────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────────┐
           Layer 3  │     ReCaptcha v2               │  Bot detection
                    │  Auto-trigger sau login fail   │
                    └────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────────┐
           Layer 4  │     CSRF Protection            │  Chống Cross-Site Request
                    │  Token-based per session       │
                    └────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────────┐
           Layer 5  │     Authentication             │  Session + Cookie httpOnly
                    │  bcrypt · OTP Email · JWT      │
                    └────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────────┐
           Layer 6  │     Input Sanitization         │  XSS Prevention
                    │  DOMPurify · Parameterized SQL │
                    └────────────────────────────────┘
```

---

## 🚀 Cài đặt nhanh

### Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu |
| :--- | :--- |
| Node.js | `18.0` trở lên (khuyến nghị `22 LTS`) |
| npm | `9.0` trở lên |
| PostgreSQL | `14` trở lên (khuyến nghị `16`) |
| Git | Bất kỳ |
| Docker *(tùy chọn)* | `24.0` trở lên |

### ⚡ Phương pháp 1: Chạy local (Development)

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/CookingBoy.git
cd CookingBoy

# 2. Cài đặt dependencies cho cả Frontend & Backend
npm run install:all

# 3. Cấu hình môi trường Backend
cp api/.env.example api/.env
# → Mở api/.env và điền thông tin database, SMTP, ReCaptcha...

# 4. Cấu hình môi trường Frontend
cp web/.env.example web/.env

# 5. Tạo database & import schema
psql -U postgres -c "CREATE DATABASE CookingDB;"
psql -U postgres -d CookingDB -f database/postgresql_schema.sql

# 6. (Khuyến nghị) Hash mật khẩu admin mặc định
npm --prefix api run migrate:admin-passwords

# 7. Khởi chạy cả Frontend + Backend đồng thời
npm run dev
```

> **Kết quả:** Frontend chạy tại `http://localhost:5173` · Backend API tại `http://localhost:3001`

### 🐳 Phương pháp 2: Docker Compose (Production)

```bash
# 1. Tạo file cấu hình môi trường Docker
cp deploy/docker.env.example .env.docker

# 2. Chỉnh sửa các biến cần thiết
#    DB_PASSWORD, SESSION_SECRET, SMTP_*, RECAPTCHA_*...

# 3. Khởi chạy toàn bộ hệ thống
docker compose --env-file .env.docker up -d --build

# 4. Kiểm tra sức khỏe hệ thống
docker compose ps
```

> **Kết quả:** Ứng dụng chạy tại `http://localhost:8080` với Nginx reverse proxy

### 📜 Scripts có sẵn

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy đồng thời Backend + Frontend (dev mode) |
| `npm run fe` | Chỉ chạy Frontend |
| `npm run be` | Chỉ chạy Backend |
| `npm run build:all` | Build production bundle |
| `npm run ci` | Type-check & lint (dùng cho CI/CD) |
| `npm run install:all` | Cài packages cho cả hai workspace |

---

## ⚙️ Biến môi trường

### Backend (`api/.env`)

| Biến | Bắt buộc | Mặc định (Dev) | Mô tả |
| :--- | :---: | :--- | :--- |
| `PORT` | ❌ | `3001` | Cổng API server |
| `NODE_ENV` | ❌ | `development` | Môi trường chạy |
| `DB_HOST` | ❌ | `localhost` | PostgreSQL host |
| `DB_PORT` | ❌ | `5432` | PostgreSQL port |
| `DB_USER` | ❌ | `Cooking` | Database user |
| `DB_PASSWORD` | ✅* | — | Mật khẩu database |
| `DB_NAME` | ❌ | `CookingDB` | Tên database |
| `SESSION_SECRET` | ✅* | — | Secret key cho session |
| `CORS_ORIGIN` | ❌ | `http://localhost:5173` | Allowed origins (phân cách bằng `,`) |
| `SMTP_HOST` | ❌ | — | SMTP server (Gmail, SendGrid...) |
| `SMTP_PORT` | ❌ | `587` | SMTP port |
| `SMTP_USER` | ❌ | — | SMTP username |
| `SMTP_PASS` | ❌ | — | SMTP password / app password |
| `MAIL_FROM` | ❌ | `CookingWeb <noreply@localhost>` | Địa chỉ gửi email |
| `RECAPTCHA_SECRET_KEY` | ❌ | — | Google ReCaptcha v2 secret key |
| `AI_API_KEY` | ❌ | — | Gemini API key cho gợi ý AI |

> *\* Bắt buộc trong `production`. Ở `development`, sử dụng giá trị fallback.*

### Frontend (`web/.env`)

| Biến | Mô tả |
| :--- | :--- |
| `VITE_RECAPTCHA_SITE_KEY` | Google ReCaptcha v2 site key |

---

## 📁 Cấu trúc thư mục

```text
CookingBoy/
│
├── api/                          # ─── Backend (Node.js + Express 5) ───
│   ├── src/
│   │   ├── index.ts              #   Entry point: khởi tạo server
│   │   ├── env.ts                #   Quản lý biến môi trường
│   │   ├── db/                   #   Kết nối PostgreSQL pool
│   │   ├── middleware/           #   Middleware bảo mật
│   │   │   ├── csrf.ts           #     CSRF token protection
│   │   │   ├── rateLimits.ts     #     Rate limiting rules
│   │   │   ├── requireAuth.ts    #     Xác thực người dùng
│   │   │   └── requireAdmin.ts   #     Xác thực quản trị viên
│   │   ├── routes/               #   API route handlers
│   │   │   ├── auth.ts           #     Đăng ký, đăng nhập, OTP
│   │   │   ├── recipes.ts        #     CRUD công thức
│   │   │   ├── blog.ts           #     CRUD bài viết
│   │   │   ├── health.ts         #     Kế hoạch dinh dưỡng
│   │   │   └── admin.ts          #     Quản trị hệ thống
│   │   ├── services/             #   Business logic
│   │   │   ├── mailService.ts    #     Gửi email OTP (SMTP)
│   │   │   ├── aiService.ts      #     Tích hợp Gemini AI
│   │   │   └── mealPlanHandler.ts#     Xử lý kế hoạch bữa ăn
│   │   ├── repos/                #   Data access layer
│   │   └── types/                #   TypeScript interfaces
│   ├── Dockerfile                #   Docker image cho API
│   ├── tsconfig.json
│   └── package.json
│
├── web/                          # ─── Frontend (React 19 + Vite 8) ───
│   ├── src/
│   │   ├── main.tsx              #   Entry point
│   │   ├── App.tsx               #   Root component, routing, transitions
│   │   ├── components/           #   Shared components
│   │   │   ├── Navbar.tsx        #     Navigation bar
│   │   │   ├── Footer.tsx        #     Footer
│   │   │   ├── Layout.tsx        #     Page layout wrapper
│   │   │   ├── AuthModal.tsx     #     Modal đăng ký / đăng nhập
│   │   │   ├── RecaptchaCook.tsx #     ReCaptcha component
│   │   │   ├── ui/              #     UI primitives (Skeleton...)
│   │   │   └── motion/          #     Animation utilities
│   │   ├── pages/               #   Route pages
│   │   │   ├── Home.tsx         #     Trang chủ
│   │   │   ├── About/           #     Giới thiệu
│   │   │   ├── Recipes/         #     Công thức (list + detail)
│   │   │   ├── Blog/            #     Blog (list + detail)
│   │   │   ├── Health/          #     Sức khỏe (list + detail)
│   │   │   ├── Profile/         #     Hồ sơ cá nhân
│   │   │   └── Admin/           #     Admin dashboard + login
│   │   ├── lib/                 #   Utilities & helpers
│   │   └── assets/              #   Static resources
│   ├── public/                  #   Public assets
│   ├── Dockerfile               #   Docker image cho Frontend
│   ├── vite.config.ts
│   └── package.json
│
├── database/                    # ─── Database ───
│   ├── postgresql_schema.sql    #   Schema chính (15 bảng)
│   ├── grant_app_user.sql       #   Phân quyền database user
│   └── migration_pending_registrations.sql
│
├── deploy/                      # ─── Deployment ───
│   ├── docker.env.example       #   Mẫu biến môi trường Docker
│   ├── nginx-cookapp.conf.example  # Nginx production config
│   └── nginx.docker.conf        #   Nginx Docker config
│
├── Tutorial/                    # ─── Tài liệu kỹ thuật ───
│   ├── README.md                #   Tổng quan tài liệu
│   ├── cong_cu.md               #   Công cụ sử dụng
│   ├── huong_dan_su_dung.md     #   Hướng dẫn cài đặt
│   ├── logic_thuat_toan.md      #   Logic & thuật toán
│   ├── tags_fe.md               #   Kiến trúc Frontend
│   ├── ham_cau_lenh_be.md       #   API Backend reference
│   └── cau_lenh_sql.md          #   Hướng dẫn SQL
│
├── docker-compose.yml           #   Docker Compose orchestration
├── package.json                 #   Root workspace scripts
├── DEPLOY.md                    #   Hướng dẫn triển khai chi tiết
└── .gitignore                   #   Bảo mật: loại bỏ .env, keys, secrets
```

---

## 📚 Tài liệu hướng dẫn

Bộ tài liệu toàn diện dành cho lập trình viên muốn cài đặt, mở rộng hoặc đóng góp vào dự án:

| 📑 Tài liệu | 📝 Mô tả |
| :--- | :--- |
| 🛠️ [Công Cụ Sử Dụng](./Tutorial/cong_cu.md) | Tổng hợp các phần mềm, package và công cụ cần thiết để phát triển |
| 🚀 [Hướng Dẫn Cài Đặt](./Tutorial/huong_dan_su_dung.md) | Các bước setup, khởi chạy Frontend & Backend trên môi trường Local |
| 🧠 [Logic & Thuật Toán](./Tutorial/logic_thuat_toan.md) | Phân tích chi tiết quy trình xác thực, luồng bảo mật và thuật toán |
| 🎨 [Kiến Trúc Frontend](./Tutorial/tags_fe.md) | Định hướng thiết kế các thành phần giao diện, Component trong ReactJS |
| 🔌 [Tài Liệu API Backend](./Tutorial/ham_cau_lenh_be.md) | Danh sách cụ thể Endpoint, mô tả luồng hoạt động của các hàm backend |
| 🗄️ [Triển Khai Database](./Tutorial/cau_lenh_sql.md) | Hướng dẫn thao tác, cài đặt cấu trúc PostgreSQL và các câu lệnh SQL mẫu |
| 🐳 [Hướng Dẫn Deploy](./DEPLOY.md) | Triển khai production với Docker Compose & Nginx reverse proxy |

---

## 🗺️ Routing Map

| Path | Component | Mô tả | Quyền truy cập |
| :--- | :--- | :--- | :---: |
| `/` | `Home` | Trang chủ — Hero banner, Featured recipes | 🌐 Public |
| `/about` | `About` | Giới thiệu dự án & đội ngũ | 🌐 Public |
| `/recipes` | `Recipes` | Duyệt & tìm kiếm công thức | 🌐 Public |
| `/recipes/detail/:id` | `RecipeDetail` | Chi tiết công thức | 🌐 Public |
| `/blog` | `Blog` | Danh sách bài viết | 🌐 Public |
| `/blog/detail/:id` | `BlogDetail` | Chi tiết bài viết | 🌐 Public |
| `/health` | `Health` | Trang sức khỏe & dinh dưỡng | 🌐 Public |
| `/health/detail/:id` | `HealthDetail` | Chi tiết kế hoạch sức khỏe | 🌐 Public |
| `/profile` | `Profile` | Hồ sơ & quản lý tài khoản | 🔒 Auth |
| `/admin/login` | `AdminLogin` | Đăng nhập quản trị | 🌐 Public |
| `/admin` | `AdminPage` | Bảng điều khiển quản trị | 🔐 Admin |

---

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Hãy làm theo các bước sau:

```bash
# 1. Fork repository
# 2. Tạo branch mới
git checkout -b feature/ten-tinh-nang

# 3. Commit thay đổi
git commit -m "feat: thêm tính năng mới"

# 4. Push lên fork
git push origin feature/ten-tinh-nang

# 5. Tạo Pull Request
```

### Commit Convention

| Prefix | Mục đích |
| :--- | :--- |
| `feat:` | Tính năng mới |
| `fix:` | Sửa lỗi |
| `docs:` | Cập nhật tài liệu |
| `style:` | Format code (không thay đổi logic) |
| `refactor:` | Tái cấu trúc code |
| `security:` | Cập nhật bảo mật |

---

<div id="license"></div>

## 📄 License

Dự án được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](./LICENSE) để biết thêm chi tiết.

---

<div align="center">

  **[⬆ Về đầu trang](#-cookingboy)**

  <br>

  <sub>Được xây dựng với ❤️ nhằm mang lại trải nghiệm ẩm thực số tuyệt vời nhất.</sub>

  <br>

  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" width="24" height="24">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" width="24" height="24">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" width="24" height="24">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" width="24" height="24">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="24" height="24">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" width="24" height="24">

</div>
