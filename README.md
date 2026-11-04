# Vietnam Rail Map (Beta)

Bản đồ tương tác theo dõi **vị trí ước tính** của các đoàn tàu Thống Nhất Việt Nam, thiết kế lấy cảm hứng từ chức năng của Signalbox. Đây không phải hệ thống GPS thời gian thực hay sản phẩm chính thức của Đường sắt Việt Nam.

## Chạy thử

- Mở [index.html](./index.html) bằng trình duyệt. Phiên bản triển khai GitHub Pages dùng một tệp HTML độc lập, bao gồm CSS, JavaScript và dữ liệu nhúng.
- Sau khi bật GitHub Pages với nguồn **Deploy from a branch / main / (root)**, website sẽ có tại **https://smartvnr.github.io/** (nếu GitHub Pages và gói tài khoản hỗ trợ).

## Tính năng

Bản đồ SVG Việt Nam, 38 ga tham chiếu, 10 mác tàu Thống Nhất, lọc theo tuyến/ga/chiều, chọn và theo dõi tàu, giờ tàu qua ga, dòng thời gian, tìm tàu gần người dùng (nếu được cấp quyền vị trí), chia sẻ liên kết và xuất CSV.

## Hạn chế dữ liệu

- Không có GPS trực tiếp, thông tin trễ tàu hay dự báo giờ đến từ hệ thống điều độ.
- Vị trí tàu được nội suy tuyến tính theo biểu đồ chạy tàu công khai. Lịch giả định lặp lại hằng ngày để mô phỏng; **không khẳng định tàu đang chạy thực tế**.
- Tọa độ ga và hình học tuyến mang tính biểu diễn, không dùng làm nguồn định vị chuyên ngành.
- Lịch tàu có thể thay đổi. Hãy đối chiếu cổng thông tin [Đường sắt Việt Nam](https://giotaugiave.dsvn.vn/giotau/thongnhat).

## Tham khảo

- [Giờ tàu Thống Nhất — Đường sắt Việt Nam](https://giotaugiave.dsvn.vn/giotau/thongnhat)
- [Signalbox](https://www.map.signalbox.io/)
- [Natural Earth](https://www.naturalearthdata.com/)
- [Lộ trình tính năng](./ROADMAP.md)

## Phát hành GitHub Pages

Repository hiện được tạo ở chế độ **private**. Nếu tổ chức sử dụng GitHub Free, cần chuyển repository sang **public** tại **Settings → General → Danger Zone → Change repository visibility**. Nếu tổ chức có gói GitHub hỗ trợ GitHub Pages từ repository private, có thể giữ private; website Pages vẫn có thể công khai nếu cấu hình cho phép.

Tiếp theo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**. Kiểm tra trạng thái build trong **Actions** và **Pages**.

## Mô phỏng theo đồng hồ Việt Nam (nâng cấp 04/11/2026)

Trang chạy ở **chế độ theo thời gian hiện tại** ngay khi mở, đồng bộ UTC+7 mỗi giây. Đoàn tàu tự xuất hiện khi đến giờ khởi hành theo bảng công khai và ẩn sau giờ kết thúc theo lịch. Tọa độ được nội suy giữa các ga tham chiếu từ mốc giờ qua/đi ga và lý trình.

- **● Đang trực tiếp**: tự cập nhật mỗi giây, không cần bấm phát; nếu chuyển tab rồi quay lại, thời gian được đồng bộ lại với đồng hồ thật.
- **Thanh thời gian / ngày**: chuyển sang chế độ xem một thời điểm tùy chọn; lùi/tiến từng 30 phút.
- **▶ Tua nhanh**: mô phỏng 60× / 300× / 900×; bấm lần nữa để tạm dừng.
- **◉ Về hiện tại**: quay lại theo thời gian thực ở Việt Nam.
- Các đoàn cùng mác tàu nhưng xuất phát ở hai ngày khác nhau được quản lý theo **ngày khởi hành**; các mốc `+1`, `+2` tính đúng qua ngày.

**Quan trọng:** "Trực tiếp" chỉ có nghĩa là đồng bộ với đồng hồ Việt Nam; **không phải GPS trực tiếp hay xác nhận tàu thực đang vận hành**. Các tàu được giả định chạy mỗi ngày theo lịch tham khảo, không tính tàu tăng cường, tàu bị hủy, dừng chờ, đổi giờ hoặc chậm giờ. Bảng nguồn công khai chủ yếu cung cấp giờ đi/qua ga, không đủ để tái hiện chính xác thời gian dừng tàu. Nguồn: https://giotaugiave.dsvn.vn/giotau/thongnhat và https://giotaugiave.dsvn.vn/Default.aspx.
