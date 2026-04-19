# 🖥️ ReactJS & Web Frontend: Tài Liệu Giải Phẫu Structure & Component

Hãy coi cấu trúc Frontend React của project này là một trường hợp chuẩn mực để bạn ôm tư duy thiết kế luồng Component (Hợp ngữ nhỏ đóng gói). 

## 1. Bản Chất Component Trong React (JSX/TSX là gì?)
Bạn hãy xem đoạn mã React ở một màn hình `Home` thực tế giống như một hàm Toán Học: Đầu vào nhận (Props/States), Trả xuất ra là Cấu Kết JSX (Tức HTML đã nhúng JavaScript). 
Việc này sinh ra khái niệm tách nhỏ, thay vì viết HTML dài ngàn trang, file `<Home />` gọi các sub component bên trong:
```tsx
export default function Home() {
    return (
        <div>
           <Navbar />     {/* Cục khối Thanh Chức Năng trên cùng */}
           <HeroBanner /> {/* Nội dung chào khách */}
           <Footer />     {/* Chân trang đóng đinh màn hình */}
        </div>
    )
}
```

## 2. Hiểu Tư Duy State (Trạng Thái) Bằng `useState()`
Khác HTML tĩnh (bất biến). Một giao diện web động (Dynamic page) có các nút bấm tương tác (ẩn hiện popup, gõ form đổi số..). Biến số thông thường như `let x = 1` không châm ngòi lại quá trình dóng khung (Re-rendering) màn hình ở React. Bạn muốn trang vẽ lại khi biến đổi thì dùng `useState`:
```tsx
// hook "useState" cấp thẻ Array: index 0 (giá trị thực), index 1 (Hàm Set setter làm đổi giá trị)
const [count, setCount] = useState(0);

// Nút Button click -> setCount(count + 1). 
// KHI CÓ LỆNH setCount => Giao Diện lập tức re-rendering và cập nhật số hiển thị ra màn HTML ngay tức khắc.
```

## 3. Quản Lý Vòng Đời Bằng `useEffect()` - The Effect Hook
Một Component khi sinh ra vẽ lên trình duyệt (Mouth) và biến mất (Unmouth) tạo nên vòng đời.
Trường hợp tải trang (Ví dụ Load CSDL Server Fetch Api) ta cần nó Call DATA "1 Lần Lúc Đầu Mới Vô Trang", nếu không có Hook này, màn hình re-render do chạy Component làm Load API Call điêu luyện, tạo ra Loop API Request vĩnh cửu.

```tsx
useEffect(() => {
    // Luồng Logic sẽ chạy mỗi khi Mảng Phụ Thuộc ngụ ý [Dependencies] có thay đổi.
    callServerToGet10FoodRecipies();

}, []); // [] : Rỗng nghĩa là không phụ thuộc ai, Nó chỉ run DUY NHẤT 1 lần khi thẻ này Sinh Ra ở Trình duyệt (Component did Mouth Phase).
```

## 4. Single Source of Truth (Props Drilling Chéo)
Ở Frontend CookingBoy, các Component `<RecipeCard title="Rau Củ" />` lấy "Rau Củ" là `Prop` (Tham số từ cha truyền). Component Con thụ động không đổi được giá trị Cha cấp. Việc truyền từ cấp ông -> cha -> cháu tạo Prop Drilling, dẫn đến sau này các bạn phải học tới kĩ thuật State Store/Context (Ví dụ File `userContext.tsx`) giúp bao trùm dữ liệu bọc quanh App bằng `<Provider>`.

## 5. CSS bằng String Thay Đổi Trực Quan: Tailwind Architecture
Thư viện Utility Css cho phép code Inline class siêu mạnh:
```tsx
<div className="flex flex-col md:flex-row items-center w-full px-4 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-300">
  Trẻ em và học sinh nhìn vô cũng biết là class làm gì luôn!
  - flex-col: Mobile giao diện xếp cột dọc
  - md:flex-row: Bức giới màn hình Desktop/Tablet (Kích hoạt Media Query >768px Width thì bố cục nhảy sang nằm dàn ngang)
  - transition-all duration-300: Kèm hover.. tạo Animation tự lướt nổi lên làm nổi PopUp mượt mà 0.3s.
</div>
```
