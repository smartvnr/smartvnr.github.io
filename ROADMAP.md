# Kế hoạch triển khai Vietnam Rail Map

Ngày lập: 04/11/2026. Mục tiêu: từ bản demo mô phỏng lịch tàu đến bản đồ quốc gia có dữ liệu vận hành **đã xác thực**.

## A. Đối chiếu Signalbox

| Nhóm Signalbox | Demo | Điều kiện để làm bản thật |
|---|---|---|
| Xem tàu trên bản đồ | Có (ước tính) | Data feed định vị và chuẩn hóa ID chuyến |
| Chọn tàu / hành trình / ga dừng | Có | Lịch chính xác cho từng ngày, arrival/departure riêng |
| Tìm / lọc tuyến, ga đi, ga đến | Có trên tuyến Thống Nhất | GTFS đầy đủ cả quốc gia |
| Theo dõi tàu và chia sẻ URL | Có | URL public / tracking service |
| Tìm tàu trong khu vực / gần vị trí | Có (ước tính) | GIS tuyến ray chính xác, GPS chạy tàu |
| Hiển thị chậm giờ, trạng thái sân ga | Chưa | Feed vận hành từ đơn vị sở hữu |
| ETA dự báo theo thời gian thực | Chưa | Chạy mô hình dự báo trên lịch/GPS/trễ tàu |
| Tự phát hiện tàu người dùng đang đi | Chưa | GPS thiết bị + map matching + network data |
| Chia sẻ ETA động cho người đón | Chưa | Backend track, link có thời hạn và quyền riêng tư |
| Embed/iframe cho ga, API tích hợp | Chưa | API, authentication, rate-limit, SLA |

## B. Kiến trúc khuyến nghị

```text
Nguồn lịch công khai / đối tác cung cấp dữ liệu
                │
                ▼
  Ingestion & Validation (hàng ngày)
  - nguồn, ngày hiệu lực, quyền sử dụng
  - trạm ID, mác tàu, ngày chạy, múi giờ
  - giờ đến/giờ đi riêng, lịch qua ngày
                │
                ▼
    PostgreSQL + PostGIS (lưu GTFS tĩnh)
      ├─ stations / track_segments
      ├─ routes / trips / stop_times
      └─ calendars / exceptions
                │
    ┌───────────┴──────────────┐
    ▼                          ▼
Lịch chạy chuẩn hóa       GPS / vận hành (*)
    │                          │
    └───────────┬──────────────┘
                ▼
  Position & ETA Engine (cờ `estimated` hoặc `verified`)
                │
                ▼
      REST API + WebSocket / SSE
                │
                ▼
    Web map / mobile / embed / dashboard

(*) Khi có thỏa thuận chia sẻ dữ liệu, không tự nhận có sẵn.
```

Hợp đồng dữ liệu cho mỗi vị trí tàu nên có: `trip_id`, `service_date`, `train_code`, `observed_at`, `lat`, `lon`, `source_type`, `is_estimated`, `confidence`, `delay_minutes?`, `next_station_id?`, `eta?`. Không cho giao diện gắn nhãn "Live" khi `source_type` là lịch mô phỏng.

## C. Giai đoạn thực thi

**P0 — Bản demo độc lập (đã hoàn thành):** trang SVG chạy offline, 38 ga tham chiếu, 10 mác tàu Thống Nhất, 5 tuyến nhánh sơ bộ, lọc/tìm/bám theo, xem giờ, xuất CSV, chia sẻ, responsive, kiểm thử cơ bản.

**P1 — Mạng lưới và dữ liệu đúng (ưu tiên tiếp theo):** nhập dữ liệu hình học tuyến thực theo giấy phép OSM/GIS; mã hóa ga thống nhất; thêm Hà Nội–Lào Cai, Hà Nội–Hải Phòng, Hà Nội–Đồng Đăng, Hà Nội–Thái Nguyên, Kép–Hạ Long, Sài Gòn–Phan Thiết và các tuyến tàu khách hiện hành. Tạo dữ liệu GTFS/GTFS-RT chuẩn hóa, lịch hiệu lực theo ngày/ngoại lệ; quản trị chất lượng dữ liệu. Phân biệt "không có dữ liệu" với "không có tàu".

**P2 — Dữ liệu thời gian thực:** đàm phán với đơn vị vận hành / cung cấp dữ liệu, tích hợp GPS/điều độ hợp pháp, cập nhật mỗi 15–60 giây nếu có SLA, phát hiện dữ liệu cũ, hiển thị thời điểm cập nhật, trạng thái tin cậy, lịch trễ và thông báo gián đoạn. Không dùng tốc độ trung bình chặng làm "vận tốc hiện tại".

**P3 — Sản phẩm và kinh doanh:** chia sẻ ETA động, push alert ga đến, tìm kiếm hành trình đa chặng, API công cộng có giới hạn, widget nhúng bảng điện tử nhà ga, quốc tế hóa, analytics, bảo mật và chính sách dữ liệu cá nhân.

## D. Tiêu chí nghiệm thu trước khi công bố live

- Có kiểm tra tọa độ ga, track geometry, version/license; tách rõ `planned / estimated / observed`.
- Giờ tàu đúng từng ngày, có hỗ trợ múi giờ, ngày dịch vụ và hủy tàu.
- Kiểm thử vị trí ước tính so với event thực, có sai số và cờ tin cậy.
- Kịch bản lỗi GPS/API phải chuyển sang cảnh báo chứ không tiếp tục hiện "live".
- Kiểm thử bảo mật HTTP headers, CSRF, rate-limiting và privacy nếu thêm backend.
- Có cảnh báo miễn trừ và liên kết đến nơi kiểm tra giờ tàu chính thức.
- Thiết kế mobile chịu tải, vị trí có xử lý chồng marker, performance và accessibility.
- Không sử dụng trái phép dữ liệu riêng của Signalbox, bản đồ nguồn, hoặc API bị hạn chế.

## E. Đề xuất ưu tiên sản phẩm

Ưu tiên **độ tin cậy nguồn dữ liệu > số lượng marker**. V1 công khai nên chọn một tuyến có lịch chuẩn và label "Theo lịch" rõ ràng. Chỉ khi có GPS/dispatch thực mới được quảng bá là "tàu đang ở đây". Cách này tránh sản phẩm đẹp nhưng đánh lừa người dùng khi đi đón tàu hoặc lên kế hoạch ra ga.