# 🚀 Hệ Thống Quản Lý & Xuất Báo Giá Sản Phẩm (TaoHoaDon)

Ứng dụng Web Full-stack chuyên biệt cho việc **tạo, quản lý, tính toán tài chính chính xác (zero floating-point error) và xuất PDF báo giá chuẩn A4** cho doanh nghiệp.

---

## 🌟 Tính Năng Nổi Bật

- **Dashboard Tổng Quan**: Thống kê số lượng báo giá, giá trị theo tháng, trạng thái duyệt và danh sách báo giá mới nhất.
- **Quản Lý Báo Giá Toàn Diện**:
  - Tự động sinh mã báo giá dạng chuỗi số liên tục `BG-2026-XXXX`.
  - Hỗ trợ lưu bản chụp (**Snapshot**) thông tin sản phẩm và đơn giá tại thời điểm tạo báo giá, bảo đảm không bị thay đổi khi danh mục sản phẩm thay đổi trong tương lai.
  - Quản lý trạng thái: `Bản nháp (Draft)`, `Đã gửi (Sent)`, `Đã duyệt (Accepted)`, `Từ chối (Rejected)`, `Hết hạn (Expired)`.
  - Thao tác nhanh: **Xem Preview**, **Chỉnh sửa**, **Nhân bản (Duplicate)**, **Tải PDF**, **Xóa**.
- **Quản Lý Sản Phẩm & Gói Dịch Vụ**: Quản lý mã SP, tên gói, đơn vị tính, đơn giá, thuế suất VAT, mô tả ngắn gọn (tối đa 150-200 ký tự theo quy chuẩn hiện đại).
- **Quản Lý Khách Hàng**: Lưu trữ tên công ty, MST, người đại diện, số điện thoại, email, địa chỉ.
- **Tính Toán Tài Chính Chuẩn Xác**: Sử dụng `Decimal` xử lý tiền tệ, tránh hoàn toàn sai số làm tròn số thực.
- **Xuất PDF Chuẩn A4**: Sử dụng **Puppeteer** sinh file PDF server-side với giao diện tối giản, sang trọng, hỗ trợ font tiếng Việt và in ấn hoàn hảo.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Puppeteer, JWT Auth, Bcrypt.
- **Shared Package**: `@taohoadon/shared` chia sẻ types, Zod schemas và logic tính toán giữa Client & Server.
- **Database**: SQLite (Mặc định cho Local Dev) / PostgreSQL (Hỗ trợ qua Docker).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài Đặt Dependencies

Tại thư mục gốc của dự án:

```bash
npm install
```

### 2. Khởi Tạo Cơ Sở Dữ Liệu & Nạp Dữ Liệu Mẫu (Seed Data)

Chạy các lệnh Prisma:

```bash
# Tạo Prisma Client
npm run db:generate

# Đồng bộ cấu trúc bảng vào Database
npm run db:push

# Nạp dữ liệu mẫu (Sản phẩm mẫu, khách hàng mẫu, báo giá mẫu & tài khoản admin)
npm run db:seed
```

> **Tài khoản đăng nhập mặc định:**
> - Email: `admin@baogia.vn`
> - Mật khẩu: `123456`

### 3. Chạy Ứng Dụng Trong Môi Trường Phát Triển (Dev Mode)

Khởi động đồng thời cả Backend API và Frontend Web:

```bash
# Chạy cả 2
npm run dev

# Hoặc chạy riêng từng service:
# Terminal 1: Backend API (Port 4000)
npm run dev:api

# Terminal 2: Frontend Web (Port 5173)
npm run dev:web
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000/api](http://localhost:4000/api)

---

## 🤖 Trợ Lý AI (Chatbox)

Nút ✨ ở góc phải màn hình mở trợ lý AI (dùng Google Gemini). Trợ lý có thể:

- Tìm sản phẩm, khách hàng, xem công nợ, tra cứu đơn hàng, thống kê doanh số theo ngày.
- Soạn **bản nháp** đơn hàng từ câu lệnh, ví dụ: *"Tạo đơn cho Minh Phát: 2 tủ bếp 90, 1 giá bát 60 chiết khấu 10%"*.

An toàn: AI chỉ **đọc** dữ liệu theo đúng quyền của người dùng (USER chỉ thấy đơn của mình). Giá, VAT lấy từ danh mục và tiền được tính bằng `calculateQuotationTotals`, AI không tự tính. Đơn chỉ được lưu khi người dùng bấm **"Tạo đơn nháp"** (gọi API tạo đơn bình thường, có ghi nhật ký).

Cấu hình trong `apps/api/.env`:

```bash
GEMINI_API_KEY="..."          # lấy tại https://aistudio.google.com/apikey
AI_MODEL="gemini-2.5-flash"   # tùy chọn
```

Không có khóa API thì nút trợ lý tự ẩn. Mã nguồn: `apps/api/src/assistant/`, `apps/web/src/components/AssistantChat.tsx`.

---

## 🧪 Chạy Bộ Kiểm Thử (Unit Tests)

Bộ test kiểm tra độ chính xác của công thức tính tiền tệ, chiết khấu, thuế VAT và các trường hợp biên:

```bash
npm run test
```

---

## 🐳 Chạy Bằng Docker Compose (Tùy chọn)

Nếu bạn muốn chạy hệ thống kèm PostgreSQL trong Docker:

```bash
docker compose up --build -d
```
