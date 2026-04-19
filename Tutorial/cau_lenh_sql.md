# 📂 Cẩm Nang Đào Sâu: Cơ Sở Dữ Liệu Quan Hệ SQL (PostgreSQL)

Phần này sẽ bóc tách các khái niệm CSDL Quan Hệ mạnh mẽ nhất dưới góc nhìn của một kỹ sư Data Analytics.

## 1. DDL: Ràng Buộc Sự Toàn Vẹn Không Thể Phá Vỡ (Data Integrity Constraints)
Hệ Quản trị dữ liệu RDBMS (Relational Database) như PostgreSQL không cho phép dữ liệu Nhập bừa (Khác với mảng tuỳ tiện noSQL MongoDB). Table khi sinh ra với câu lệnh DDL có các bức tường (Filters) Check.
Qua ví dụ bản `pending_registrations` ta có:
```sql
CREATE TABLE IF NOT EXISTS pending_registrations (
  email VARCHAR(150) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);
```
**Bài Học Schema:** 
* `email` đứng làm vai `PRIMARY KEY` (Khoá chính yếu trỏ thẻ Index). Bạn không thể Insert dòng thứ 2 với một email trùng. Hệ thống ném thẳng lỗi cực mạnh (Conflict/Violation ID).
* Các Keyword `NOT NULL` được coi như "Cấm bỏ trống". Nếu Backend gửi mã SQL chèn thiếu trường đó, DBMS tự văng trả (Reject), bảo vệ CSDL khỏi các Record rác vô dụng dính `NULL`.

## 2. DML Vĩ Mô: Injection Sâu Sắc Bằng `Parameterized` - Trái Tim Lõi Bảo Mật
Như đã nhắc ở trên, Không nối chuỗi dạng String Append: 
`"...WHERE e = '` + email + `"`
Bởi hacker lợi dụng nhét string `a@a.com' OR '1'='1`. Trình DB khi Compile đọc ra nó sẽ thấy Lệnh Logic "OR 1=1 Luôn Luôn ĐÚNG". Tức là bỏ qua Check Email, ĐĂNG NHẬP ngay Lập Tức tài khoản quản trị Admin đầu tiên!!. Lỗi kinh điển SQL Injection càn quét mạng mẽ toàn cầu.

**Khắc Phục bằng DB Driver (`$1, $2, $3`):**
Cả Java, Node hay PHP đều bọc biến gọi Param. 
```sql
pool.query('SELECT * FROM users WHERE email = $1', [inputEmail])
```
Query Engine DB tách biệt 2 luồng: Nó lấy câu "SELECT...WHERE = \$1" đi dịch thành cây AST (Syntax Check Compiler Của Máy Chủ DB). Sau khi dịch Cứng câu lệnh Mẫu xong, nó rước cái túi Chứa `inputEmail` bọc kín dạng Blob cắm nhẹ vào lõi thực thi Runtime (Không dịch lại cú pháp nữa). Mọi phép nhúng `OR 1=1` giờ chỉ vô hại và bị ép dịch nghĩa "Thẻ Chuỗi Ký Tự". Sập Bẫy Hacker!

## 3. JOIN Khóa Kép Foreign Keys (Tương Quan Bảng)
Khi ta có 2 bảng, Bảng Bài Viết (Recipes) & Bảng Thành Viên (Users). 
Sợi xích vô hình kết nối giữa 1 Bài do Ai viết là khóa ngoại (Foreign key) trong bảng Recipes `author_id`.
Khi cần load Data một Bài Viết Lên Page hiển thị. Ta không Select 2 Lần qua 2 Bảng vì tốc độ Ping I/O Call Disk ổ cứng rất dài. Ta Select 2 bảng chung vô 1 Phép JOIN cực ảo và gom thành 1 Bảng Ảo Nhất Quán duy nhất gởi lên FE.

```sql
SELECT 
    r.title AS rec_title,
    r.difficulty,
    u.full_name AS author_name,
    u.avatar_url
FROM recipes r
JOIN users u ON r.author_id = u.id           -- Đem 2 mốc nối dán vào nhau
WHERE r.id = $1 AND r.is_published = true;
```

## 4. Bất Biến Nguyên Tử Trong Giao Dịch (ACID Transactions)
Nâng cấp hơn, nếu có lúc bạn chuyển 1.000$ từ ví User 1 sang User 2. Tác vụ bị chia mảnh:
Bước A) Trừ tk user 1 (- 1000). Cúp Điện đứt cáp Server mạng lag! -> Bước B) Không Chạy (User 2 chưa kịp cộng + 1000). Rủi ro bay màu $1000. Tiền đi bụi thung lũng...

**SQL sinh ra Khối (Transaction Block): `BEGIN` ... `COMMIT;`**
```sql
BEGIN;  -- Start Mode đóng băng

UPDATE bank SET balance = balance - 1000 WHERE id = 1;
UPDATE bank SET balance = balance + 1000 WHERE id = 2;

COMMIT; -- End Block
```
Chỉ khi TẤT CẢ các dòng Update tới Commit được Chay thành công 100%, Dữ liệu mới bung ra cắm cứng xuống Disk. Nếu cúp điện giữa chừng, toàn bộ các phép thử biến đổi ảo `BEGIN` sẽ bốc hơi Rollback xoá tuốt trả y lại trạng thái cũ từ ban đầu. ACID giữ tính nhất quán vĩnh hằng!
