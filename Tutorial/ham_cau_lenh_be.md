# 🌍 Khai Phá Backend (Mặt Khuất Hệ Thống): Lối Viết Node.js + Express

Kiến trúc Backend của CookingBoy chuẩn hóa việc xử lý các tuyến đường theo phương pháp RESTful API thiết kế để phản hồi nhanh.

## 1. HTTP Protocol (HTTP là gì và Tại sao dùng các Method như nó?)
Hệ thống sử dụng các Method quy chuẩn theo HTTP/1.1:
- `GET`: "Cho tôi mượn lấy data". Khi load màn Home, giao diện FE sẽ dùng GET gọi backend xin dữ liệu 10 bài món ăn.
- `POST`: "Tôi ném hàng cho web đăng kí vào Kho". Phương thức nhét dữ liệu tạo mới. (Ví dụ Send OTP, Form Login)
- `PUT/PATCH`: "Sửa hồ sơ/hàng hoá cho tôi thành như sau". Ví dụ Update tên User, Update mật khẩu.
- `DELETE`: Dọn, xoá Data. Đóng, dẹp phiên session login người dùng.

Mỗi đường dẫn URL Router (ví dụ `apiRouter.get("/user/profile")`) đại diện cho 1 tài nguyên độc lập.
Lệnh Express xử lý:
```typescript
authRouter.get('/admin/stats', async (req, res) => {
    // req (Request object): Các gói bao trong cặp Header, Cookie, Parameters và Thông tin IP nằm ở Req
    // res (Response object): Gọi cái đuôi kết thúc - Trả File, gãy Error (500), Success JSON (200), Chuyển hướng 302...
});
```

## 2. Express Middleware - Băng Chuyền Dây Chuyền Nhà Máy
Mấu chốt của ExpressJS là tính kết dính các hàm với nhau qua khái niệm Middleware. Middleware là 1 khối chặn nhận 3 tham số `(req, res, next)`.
Khi code chạy từ `(req, res)` tới block Middleware, nó tính toán check điều kiện: "Ông có thẻ Admin không?", "IP của ông có đang DDoS không?", "Dữ liệu có hợp lệ (validate body bằng Express-Validator) không?"
Nếu điều kiện được duyệt (Ok!) thì gọi `next()` nhả cửa chạy sang bước kế tiếp. Code Controller ở trong t cùng hoàn toàn sạch (Vì Rác đã bị lọc ngoài).
```typescript
import { Request, Response, NextFunction } from 'express';

// Một Function Middleware Custom: Phải có Session
export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    // Không có Session (Khách Mới) => Khóa cổ, nhả response 401 Unauthorized Đẩy thẳng.
    return res.status(401).json({ error: 'Quý vị chưa đăng nhập vào hệ thống!' });
  }
  // Có Session => Tiếp tục vô luồng chính (Kích hoạt Hàm Controller Endpoint).
  next();
}

// Cách gọi ứng dụng:
authRouter.post('/cooking/recipe/new', requireSession, async (req, res) => {
    // Code ở đây được chạy chỉ khi "requireSession" thông qua `next()`
})
```

## 3. Quản Trị Cấp Kết Nối Data (Connection Pooling PGBouncer vs Native)
DB PostgreSQL khi nhận một lệnh tạo "Session DB", tiến trình hệ điều hành máy DB ăn rất nhiều tài nguyên. Nếu 200 HTTP API xin vào Node/1 giây mà mở 200 "DB Connections", Database Server sẽ ngập ngụa, đứt (Out of Connections Error).
Khái niệm **Pool** ra đời trong Project: Lúc NodeJS mọc cái Server, nó đi mở trước `MAX 10` ống cống tới DB và đóng băng chờ. Mỗi 1 Request từ Khách vào xin thao tác, nó rút 1 đường ống XÀI KẾ ĐÓ gọi vào DB -> Gọi xong thay vì nổ bỏ (Hủy ống) nó **Release Mượn Trả Lại Cổng Pool**, nhét trở lại chỗ trống để Khách khác gọi vào mượn lại cái ống đó dùng luân chuyển tiếp. Việc này đỡ tốn CPU mở Socket Ảo từ đầu cho Engine API.

## 4. Tách Function Theo Dịch Vụ - Module Micro-service Scale (NodeMailer)
Hạn chế viết một file File `AuthRouter.ts` dài quá 3000 dòng ngập ngụa logic sinh password ảo, gửi mail SMTP.
Dự án tách các file Utility Utils ra thành `/services/mailService.ts`. Các Router chỉ việc Tái sử dụng (Import gọi hàm): Code sạch nhẵn Clean Architecture.
```typescript
import { sendOtpEmail } from '../services/mailService.js';
import { logAuthLogin } from '../lib/auditLog.js';

// Trong Cục Controller, chỉ việc Pass Parameter
await sendOtpEmail(dbUser.email, dbUser.name, hashcode, "register")
await logAuthLogin(dbUser.id, ipTrk, "SUCCESS") // -> Gọi tiếp Service Cắm Log theo vết...
```
