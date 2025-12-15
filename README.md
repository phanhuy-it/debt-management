# Debt Management App

Ứng dụng quản lý thông minh - Quản lý các khoản vay ngân hàng, thẻ tín dụng và chi tiêu cố định.

## Tính năng

- 📊 **Dashboard tổng quan**: Xem tổng hợp số tiền vay, đã trả và còn lại
- 💳 **Quản lý khoản vay ngân hàng**: Theo dõi các khoản vay ngân hàng với số kỳ, tháng tất toán
- 👥 **Quản lý vay người thân**: Theo dõi các khoản vay từ người thân, bạn bè
- 💰 **Quản lý thẻ tín dụng**: Theo dõi dư nợ và hạn mức thẻ tín dụng
- 🏠 **Chi tiêu cố định**: Quản lý các khoản chi tiêu định kỳ hàng tháng
- 📅 **Lịch thanh toán**: Xem lịch thanh toán chi tiết theo ngày
- 📈 **Thống kê**: Xem biểu đồ và thống kê chi tiết

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts (biểu đồ)
- Express (backend server)

## Cài đặt và chạy

### Prerequisites
- Node.js (v18 trở lên)

### Cài đặt

```bash
# Cài đặt dependencies
npm install
```

### Chạy development

```bash
# Chạy cả frontend và backend server
npm run dev:all

# Hoặc chạy riêng
npm run dev          # Frontend only
npm run dev:server   # Backend server only
```

### Build cho production

```bash
npm run build
```

## Deploy lên Vercel

1. Push code lên GitHub
2. Kết nối repository với Vercel
3. Vercel sẽ tự động detect và deploy

**Lưu ý**: Cần cấu hình build command và output directory:
- Build Command: `npm run build`
- Output Directory: `dist`

## Cấu trúc project

```
├── components/          # React components
│   ├── Calendar.tsx    # Component lịch thanh toán
│   ├── Dashboard.tsx   # Trang tổng quan
│   ├── LoanList.tsx    # Danh sách khoản vay
│   └── ...
├── services/           # Service layer
├── server/             # Backend server
├── types.ts           # TypeScript types
└── App.tsx            # Main app component
```

## License

MIT
