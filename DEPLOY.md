# Deploy production (Cook)

Tài liệu ngắn: build, biến môi trường, Nginx, Docker, health check và log audit.

## Kiến trúc gợi ý

- **Nginx** (HTTPS): phục vụ thư mục `web/dist` + reverse proxy `/api` → Node (mặc định `127.0.0.1:3001`).
- **Node API** (`api`): `npm run build` rồi `npm run start` (hoặc Docker, xem dưới).
- **PostgreSQL**: import schema lần đầu từ `database/postgresql_schema.sql` (và migration nếu có).

## Build

```bash
npm run install:all
npm run build:all
```

- Frontend: `web/dist`
- API: `api/dist`

## Biến môi trường API (`api/.env`)

Xem `api/.env.example`. Production bắt buộc (khi `NODE_ENV=production`): `DB_*`, `SESSION_SECRET`, v.v.

- **`CORS_ORIGIN`**: origin trình duyệt thấy (ví dụ `https://cook.example.com`). Cùng host với Nginx thì ghi đúng URL HTTPS đó.
- **`RECAPTCHA_SECRET_KEY`**: khớp với `VITE_RECAPTCHA_SITE_KEY` khi build web (reCAPTCHA v2).

## Biến môi trường Web (build-time)

- **`VITE_RECAPTCHA_SITE_KEY`**: cần có **trước** khi `npm --prefix web run build` (Vite embed vào bundle).

## Nginx (HSTS + CSP + rate limit)

File mẫu copy-paste (có hướng dẫn từng bước):

- [`deploy/nginx-cookapp.conf.example`](deploy/nginx-cookapp.conf.example)

Gồm: redirect HTTP→HTTPS, HSTS, CSP (khớp `web/vite.config.ts` preview), `limit_req` riêng cho `/api/auth/login` và `/api/admin/login` (bổ sung cho rate limit trong API).

Điền chỉnh: `server_name`, đường dẫn SSL Let’s Encrypt, `root` trỏ tới `web/dist`, upstream Node nếu khác cổng.

## Rate limit trong API

Đã cấu hình trong `api/src/middleware/rateLimits.ts` (ví dụ đăng nhập user/admin theo IP, cửa sổ 15 phút). reCAPTCHA sau N lần sai vẫn giữ nguyên.

## Health check

| Endpoint        | Mục đích |
|----------------|----------|
| `GET /api/healthz` | Process còn sống (200 nhanh, dùng LB/uptime). |
| `GET /api/readyz`  | Kiểm tra kết nối PostgreSQL; **503** nếu DB không sẵn sàng (readiness). |

## Audit đăng nhập

Mỗi lần đăng nhập user/admin (thành công hoặc sai mật khẩu), API ghi **một dòng JSON** ra stdout (`event: auth_login`, `realm`, `email`, `success`, `ip`, `userAgent`, `subjectId` khi thành công). Thu thập bằng journald, Docker logs, hoặc agent log.

## Docker Compose (một lệnh thử stack)

```bash
copy deploy\docker.env.example .env.docker
# chỉnh DB_PASSWORD, SESSION_SECRET, CORS_ORIGIN, VITE_*, SMTP, RECAPTCHA...

docker compose --env-file .env.docker up --build
```

Ứng dụng: `http://localhost:8080` (cổng đổi bằng `HTTP_PORT` trong `.env.docker`). API không publish ra host, chỉ lộ qua Nginx trong container `web` (xem `web/Dockerfile` + `deploy/nginx.docker.conf`).

Chi tiết biến: `deploy/docker.env.example`.

## Chạy API thủ công (không Docker)

```bash
cd api
npm ci
npm run build
NODE_ENV=production node dist/index.js
```

Đặt `PORT` nếu khác `3001`.

## Gợi ý chọn hạ tầng

| Nhu cầu | Gợi ý |
|--------|--------|
| Kiểm soát tối đa, HSTS/CSP đúng chuẩn | **VPS + Nginx + Let’s Encrypt** — dùng mẫu `deploy/nginx-cookapp.conf.example`. |
| Ít ops, HTTPS có sẵn | **Render / Railway / Fly.io** — bật HTTPS trên dashboard; CSP/HSTS thường cấu hình ở edge hoặc headers app. |
| Chưa có domain | Chỉ dùng IP + HTTP được cho thử nghiệm; **đừng bật HSTS preload** cho đến khi có HTTPS ổn định. |

Khi bạn biết rõ: **VPS / PaaS nào**, đã có **domain + HTTPS** chưa — có thể bổ sung mẫu systemd hoặc cấu hình LB riêng cho đúng chỗ deploy.

## Secret rotation

Định kỳ đổi: `SESSION_SECRET`, mật khẩu DB, SMTP, `RECAPTCHA_*`, khóa AI — đặc biệt nếu từng lộ trong chat hoặc ảnh chụp màn hình.
