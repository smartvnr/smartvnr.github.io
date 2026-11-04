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
