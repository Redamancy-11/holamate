# 📂 HolaMate - Trình Đồng Bộ & Nhập Dữ Liệu Quán Ăn Hoà Lạc

Thư mục này được thiết kế riêng để bạn lưu trữ, quản lý và nhập dữ liệu ẩm thực (Thực đơn, Khoảng giá, Đánh giá/Review minh bạch) tại khu vực Hòa Lạc vào cơ sở dữ liệu dự án. Bạn có thể chỉnh sửa thủ công qua file Excel/CSV hoặc sử dụng công cụ quét tự động từ bản đồ để cập nhật.

---

## 📊 1. Cấu Trúc File Dữ Liệu (`vendors_template.csv`)

Bạn có thể mở file `vendors_template.csv` bằng **Excel**, **Google Sheets** hoặc bất kỳ trình duyệt văn bản nào để chỉnh sửa thủ công. Cấu trúc các cột như sau:

| Tên Cột | Kiểu Dữ Liệu | Ví dụ | Mô tả |
| :--- | :--- | :--- | :--- |
| `name` | Văn bản | `Bay Coffee & Tea` | Tên quán ăn/cà phê. |
| `category` | Danh mục | `Cafe` hoặc `Ăn uống` | Phân loại quán. |
| `latitude` | Số thực | `21.01250` | Vĩ độ của quán trên bản đồ GPS. |
| `longitude` | Số thực | `105.52950` | Kinh độ của quán trên bản đồ GPS. |
| `address` | Văn bản | `"Hồ Tân Xã, Thạch Thất, Hà Nội"` | Địa chỉ cụ thể. (Nên để trong dấu ngoặc kép `""`). |
| `priceMin` | Số nguyên | `25000` | Giá tối thiểu của menu (đơn vị VNĐ). |
| `priceMax` | Số nguyên | `49000` | Giá tối đa của menu (đơn vị VNĐ). |
| `rating` | Số thực | `4.7` | Điểm đánh giá (từ 0.0 đến 5.0). |
| `menu` | Chuỗi đặc biệt | `Cafe Muối:25k;Trà Hoa Quả:35000` | Thực đơn món ăn. Ngăn cách các món bằng dấu chấm phẩy `;`. Định dạng mỗi món là `Tên_Món:Giá_Tiền` (hỗ trợ đuôi chữ `k` hoặc số thường). |
| `tips` | Văn bản | `Nổi tiếng cafe muối béo ngậy` | Mẹo nhỏ hoặc lưu ý của quán. |
| `reviews` | Chuỗi đặc biệt | `Review 1 \| Review 2 \| Review 3` | Đánh giá minh bạch. Ngăn cách các đánh giá bằng dấu gạch đứng `\|`. |

---

## 🚀 2. Hướng Dẫn Sử Dụng Lệnh

Từ thư mục gốc dự án (hoặc thư mục `backend`), bạn chạy các lệnh sau trong PowerShell hoặc Terminal:

### A. Nhập dữ liệu từ file CSV vào Database
Chạy lệnh này sau khi bạn đã chỉnh sửa thủ công file `vendors_template.csv`:
```powershell
node backend/data_import/import_csv.js
```
*Lệnh này sẽ tự động đọc file CSV, lọc các địa điểm hợp lệ nằm trong bounding box Hoà Lạc, chuyển đổi định dạng và đồng bộ trực tiếp vào MongoDB.*

### B. Tự động quét địa điểm mới quanh Hoà Lạc (OSM / Google Maps)
Chạy lệnh quét tự động để tìm kiếm thêm các quán ăn, tiệm cafe mới quanh Hoà Lạc:
```powershell
node backend/data_import/google_maps_sync.js
```
*   **Mặc định**: Công cụ sẽ tự động sử dụng OpenStreetMap Nominatim API (Hoàn toàn miễn phí, không cần key) quét trong tọa độ khoanh vùng Hòa Lạc. Các quán mới tìm thấy sẽ được tự động append thêm vào cuối file `vendors_template.csv` và chạy lệnh import nạp vào DB.
*   **Kết nối Google Places API**: Nếu muốn kết nối nâng cao, bạn chỉ cần điền biến môi trường `GOOGLE_MAPS_API_KEY=YOUR_KEY` vào file `backend/.env`. Công cụ sẽ tự động chuyển sang quét địa điểm chất lượng cao từ Google Maps.

---

## 💡 Lưu Ý Quan Trọng
1. **Trùng lặp tên**: Trình nhập dữ liệu sẽ thực hiện phép so sánh tên không phân biệt hoa thường. Nếu trùng tên, thông tin quán trên DB sẽ được cập nhật (Update) thay vì tạo mới trùng lặp.
2. **Khoanh vùng Hoà Lạc**: Các địa điểm quét được hoặc chỉnh sửa trong CSV nếu nằm ngoài tọa độ biên Hòa Lạc (Latitude `[20.95 - 21.05]`, Longitude `[105.45 - 105.60]`) sẽ được hiển thị cảnh báo để tránh nhầm lẫn địa điểm khác.
