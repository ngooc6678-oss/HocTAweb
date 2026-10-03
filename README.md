# Wordnest · HocTAweb

Ứng dụng học từ vựng tiếng Anh với giao diện tiếng Việt.

## Chức năng

- Dán bảng Markdown, bảng sao chép từ ChatGPT hoặc văn bản phân cách bằng tab; tự tách từ, nghĩa, từ đồng nghĩa và ví dụ.
- Tìm kiếm, đánh dấu đã nhớ, học bằng thẻ, trắc nghiệm và trò chơi ghép từ.
- Chọn tuần đã thêm từ để xem và ôn riêng nhóm đó (tuần bắt đầu thứ Hai, theo giờ Việt Nam).
- Xuất và nhập bản sao lưu JSON, giữ ngày thêm và trạng thái đã nhớ.
- Văn bản có thể bôi chọn để dùng tiện ích đọc từ trên trình duyệt như eJOY, tùy quyền của tiện ích.

## Chạy trên máy

Cần Node.js >= 22.13 và npm. Sau khi tải mã nguồn:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_thick_mongu.sql
npm run dev -- --hostname 127.0.0.1
```

Lệnh tạo bảng chỉ chạy một lần cho cơ sở dữ liệu mới. Mở http://127.0.0.1:5173/; môi trường phát triển có đăng nhập mô phỏng dành riêng cho máy cá nhân. Dừng ứng dụng bằng Ctrl+C. Kho mã nguồn không cài tác vụ tự khởi động Windows.

Dữ liệu phát triển lưu trong `.wrangler/state` và không được đưa lên GitHub. Bản cài mới bắt đầu với cơ sở dữ liệu trống; dùng chức năng nhập bản sao lưu để chuyển dữ liệu của bạn.

## Trạng thái triển khai

Đây là **kho mã nguồn**, chưa phải địa chỉ website trực tuyến. GitHub Pages không chạy được phiên bản hiện tại vì ứng dụng cần máy chủ, Cloudflare D1 và xác thực người dùng. Đưa vào sử dụng trực tuyến cần cấu hình môi trường máy chủ, cơ sở dữ liệu và cơ chế đăng nhập phù hợp; không bật đăng nhập mô phỏng trên Internet. Bộ khung hiện dùng xác thực do Sites cung cấp khi triển khai trên Sites.

Mã nguồn không bao gồm dữ liệu học cá nhân, thông tin đăng nhập, thư viện đã cài hay cấu hình tự khởi động của máy Windows.

Chi tiết bộ khung và môi trường phát triển: [DEVELOPMENT.md](DEVELOPMENT.md).
