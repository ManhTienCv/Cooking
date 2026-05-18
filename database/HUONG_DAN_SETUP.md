# Hướng dẫn setup Database tự động

Dự án hỗ trợ **tự chạy schema + migration + dữ liệu demo** bằng terminal — không cần mở pgAdmin import từng file `.sql` thủ công.

---

## Yêu cầu

- [PostgreSQL](https://www.postgresql.org/) 14+ (khuyến nghị 15/16)
- Node.js 18+
- Đã clone repo và cài dependency: `npm run install:all`

---

## Máy mới — làm một lần

### 1. Cài PostgreSQL

Trên Windows có thể dùng installer chính thức hoặc pgAdmin kèm PostgreSQL.

### 2. Tạo user và database (nếu chưa có)

Mở **SQL Shell (psql)** hoặc Query Tool với user `postgres`:

```sql
CREATE USER "Cooking" WITH PASSWORD 'mat-khau-cua-ban';
CREATE DATABASE "CookingDB" OWNER "Cooking";
```

> Tên mặc định khớp `api/.env`. Nếu đổi tên user/DB thì cập nhật `.env` cho đúng.

Script `db:setup` cũng **thử tự tạo database** nếu user có quyền `CREATEDB`. Nếu không có quyền, tạo tay như trên.

### 3. Cấu hình `api/.env`

Sao chép từ `api/.env.example`:

```bash
copy api\.env.example api\.env
```

Điền tối thiểu:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=Cooking
DB_PASSWORD=mat-khau-cua-ban
DB_NAME=CookingDB
```

Tuỳ chọn — tài khoản admin khi seed:

```env
ADMIN_EMAIL=admin@cook.local
ADMIN_PASSWORD=Admin@Cook123456
ADMIN_NAME=Super Admin
```

### 4. Chạy setup

Từ thư mục gốc repo (`Cook/`):

```bash
npm run setup
```

Hoặc chỉ database:

```bash
npm run db:setup
```

### 5. Chạy dự án

```bash
npm run dev
```

Lệnh `dev` / `full` **tự gọi `db:setup` trước** rồi mới bật API + frontend. Lần sau migration đã chạy sẽ được bỏ qua (vài giây).

- Frontend: http://localhost:5173  
- API: http://localhost:3001  

---

## Script làm gì?

| Bước | Mô tả |
|------|--------|
| Kết nối DB | Đọc cấu hình từ `api/.env` |
| Tạo DB (tuỳ chọn) | `CREATE DATABASE` nếu chưa tồn tại |
| Migration | Chạy lần lượt các file SQL (xem bảng dưới) |
| Baseline | DB import tay trước đó vẫn được nhận — không chạy lại file đã có bảng |
| Grant | Cấp quyền cho role app (nếu user kết nối có quyền) |
| Seed dev | Admin + user demo + danh mục + công thức/bài viết/sản phẩm mẫu |

### Thứ tự file migration

1. `postgresql_schema.sql`
2. `migration_pending_registrations.sql`
3. `migration_secure_otp.sql`
4. `migration_marketplace.sql`
5. `migration_seller_security.sql`
6. `migration_messages.sql`
7. `migration_social_follows.sql`

Trạng thái lưu trong bảng `_app_migrations`.

---

## Tài khoản demo (mặc định)

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin (panel) | `admin@cook.local` | `Admin@Cook123456` |
| Người bán | `demo-seller@cook.local` | `Demo@Cook123456` |
| Người mua | `demo-buyer@cook.local` | `Demo@Cook123456` |

Seller demo có cửa hàng **Meo Meo Kitchen**, công thức/bài viết/sản phẩm mẫu để test marketplace và hồ sơ công khai.

> **Production:** không dùng mật khẩu demo. Đặt `DB_SKIP_SEED=1` và tạo admin bằng `admin:create` (xem bên dưới).

---

## Các lệnh hữu ích

Chạy từ **thư mục gốc** repo:

| Lệnh | Ý nghĩa |
|------|---------|
| `npm run setup` | `install:all` + `db:setup` |
| `npm run db:setup` | Chỉ setup database |
| `npm run dev` | `db:setup` + API + Web |

Chạy từ thư mục `api/`:

| Lệnh | Ý nghĩa |
|------|---------|
| `npm run db:setup` | Setup đầy đủ |
| `npm run db:setup -- --no-seed` | Chỉ schema, không seed demo |
| `npm run db:setup -- --migrations-only` | Chỉ migration |
| `npm run db:setup -- --seed-only` | Chỉ seed (DB đã có schema) |
| `npm run db:setup -- --no-create-db` | Không thử `CREATE DATABASE` |
| `npm run seed:default-content` | Alias seed-only |
| `npm run admin:create` | Chỉ tạo/cập nhật admin (cần `ADMIN_EMAIL`, `ADMIN_PASSWORD` trong env) |

### Biến môi trường

| Biến | Ý nghĩa |
|------|---------|
| `DB_FORCE=1` | Chạy lại migration đã đánh dấu + seed lại |
| `DB_SKIP_SEED=1` | Bỏ qua dữ liệu demo |
| `DB_CREATE=0` | Không thử tạo database |

Ví dụ (PowerShell):

```powershell
$env:DB_SKIP_SEED="1"; npm run db:setup
```

---

## Xử lý lỗi thường gặp

### `ECONNREFUSED` / không kết nối được

- PostgreSQL service đã chạy chưa?
- `DB_HOST`, `DB_PORT`, `DB_PASSWORD` trong `api/.env` đúng chưa?

### `password authentication failed`

- Sai mật khẩu user `Cooking` — sửa `.env` hoặc đổi mật khẩu trong PostgreSQL.

### `permission denied` / mã `42501`

User app không đủ quyền trên bảng. Chạy **một lần** với user `postgres`, database **CookingDB**:

```bash
psql -U postgres -d CookingDB -f database/grant_app_user.sql
```

Trong pgAdmin: chọn database `CookingDB` → Query Tool → mở file `grant_app_user.sql` → Execute.

### `must be owner of table ...`

Thường xảy ra khi DB được import tay bằng user `postgres` nhưng app chạy bằng `Cooking`. Script tự **baseline** schema cũ; nếu vẫn lỗi, chạy `grant_app_user.sql` như trên.

### Database chưa tồn tại

Tạo tay:

```sql
CREATE DATABASE "CookingDB";
```

Hoặc cấp quyền `CREATEDB` cho user `Cooking` để script tự tạo.

---

## DB đã import tay bằng pgAdmin

Không cần xóa DB. Chạy:

```bash
npm run db:setup
```

Script sẽ:

1. Nhận các bảng đã có → ghi vào `_app_migrations` (baseline)
2. Chỉ chạy migration **còn thiếu** (ví dụ `migration_social_follows.sql` nếu chưa có `user_follows`)
3. Seed demo nếu chưa chạy lần nào (`dev_seed_v1`)

---

## Tạo admin riêng (không seed đầy đủ)

Trong `api/.env`:

```env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=YourSecurePass12
```

Rồi:

```bash
cd api
npm run admin:create
```

Mật khẩu admin tối thiểu **12 ký tự**.

---

## Import thủ công (tuỳ chọn)

Nếu muốn làm tay như trước:

```bash
psql -U postgres -c "CREATE DATABASE \"CookingDB\";"
psql -U postgres -d CookingDB -f database/postgresql_schema.sql
# ... các file migration còn lại theo thứ tự ở trên
psql -U postgres -d CookingDB -f database/grant_app_user.sql
```

Sau đó vẫn nên chạy `npm run db:setup` để đồng bộ `_app_migrations` và seed (nếu cần).

---

## File liên quan

| File | Vai trò |
|------|---------|
| `api/src/scripts/setupDb.ts` | Entry chính |
| `api/src/scripts/db/migrations.ts` | Danh sách + chạy migration |
| `api/src/scripts/db/seedDev.ts` | Dữ liệu demo |
| `database/*.sql` | Schema & migration SQL |
| `database/grant_app_user.sql` | Cấp quyền role app |
| `api/.env.example` | Mẫu cấu hình |
