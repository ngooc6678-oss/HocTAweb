# Wordnest · HocTAweb

Ứng dụng học từ vựng tiếng Anh với giao diện tiếng Việt, chạy bằng Next.js trên Vercel và lưu dữ liệu theo tài khoản trên Supabase.

## Chức năng

- Dán bảng 4 cột từ ChatGPT (Markdown, bảng HTML hoặc văn bản phân cách tab); tự tách từ, nghĩa, từ đồng nghĩa và ví dụ.
- Tìm kiếm, thẻ ghi nhớ, chọn nghĩa, ghép cặp và đánh dấu từ đã nhớ.
- Ôn theo tuần thêm từ (thứ Hai–Chủ nhật, giờ Việt Nam).
- Sao lưu/khôi phục JSON giữ ngày thêm và tiến độ; từ trùng được bỏ qua.
- Đăng nhập bằng email và mật khẩu; mỗi tài khoản chỉ truy cập bộ từ của mình.
- Bôi chọn văn bản để dùng eJOY nếu tiện ích được bật trên trình duyệt.

## Triển khai

1. Tạo dự án Supabase và áp dụng SQL trong `supabase/migrations/` theo thứ tự. Bảng từ có Row Level Security để cách ly dữ liệu từng người dùng.
2. Trên Vercel, nhập kho GitHub này, chọn framework **Next.js**. Không dùng lệnh build Vinext/Cloudflare của phiên bản cũ.
3. Thêm hai biến môi trường cho Production và Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL dự án Supabase.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key của dự án (hỗ trợ `NEXT_PUBLIC_SUPABASE_ANON_KEY` nếu dùng key cũ).
4. Deploy. Trong Supabase Authentication → URL Configuration, đặt Site URL là địa chỉ Vercel vừa tạo và cấu hình redirect xác nhận tài khoản theo `DEVELOPMENT.md`.
5. Tạo tài khoản Wordnest trên trang đăng nhập rồi xác nhận email. Tài khoản học Wordnest độc lập với tài khoản quản trị Supabase/Vercel.
6. Để chuyển bộ từ cũ, đăng nhập đúng tài khoản Wordnest rồi dùng **Khôi phục** và chọn bản sao lưu JSON đã xuất từ máy cũ.

Không đưa mật khẩu, service-role key, cơ sở dữ liệu cá nhân hay tệp sao lưu lên GitHub. Ứng dụng chỉ cần publishable key; quyền truy cập dữ liệu được bảo vệ bằng đăng nhập và RLS.

## Chạy để phát triển

Cần Node.js >= 22.13. Tạo `.env.local` với hai biến ở trên rồi chạy:

```sh
npm ci
npm run dev
```

Kiểm tra trước khi triển khai:

```sh
npm run typecheck
npm run build
npm test
npm run test:auth
```

Dự án không tự khởi động cùng Windows. Website trực tuyến không cần máy tính cá nhân chạy nền.

## Ghép cặp

Nhấn ô tiếng Anh để nghe giọng đọc trình duyệt (kể cả ô đã ghép đúng). Ghép hết lượt để chuyển sang tối đa 5 từ chưa chơi; chỉ bắt đầu vòng mới khi đã dùng hết bộ từ đang chọn. Các từ trùng cách viết hoặc nghĩa được tách sang lượt khác để tránh đáp án mơ hồ.

Tiến độ ghép cặp được lưu bằng localStorage, riêng theo tài khoản và phạm vi tuần / tất cả. Tải lại trang hoặc đổi chế độ học vẫn tiếp tục lượt hiện tại. Tiến độ này chưa đồng bộ giữa các thiết bị và sẽ mất nếu xóa dữ liệu trình duyệt; bộ từ và trạng thái đã nhớ trên Supabase không bị ảnh hưởng.
