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

Repository đã chuyển sang **public** và GitHub Pages được tự động triển khai từ `main` bởi GitHub Actions. Truy cập https://smartvnr.github.io/. Mọi thay đổi phải vượt qua bộ kiểm thử mô phỏng rồi mới được triển khai.

## Mô phỏng theo đồng hồ Việt Nam (nâng cấp 04/11/2026)

Trang chạy ở **chế độ theo thời gian hiện tại** ngay khi mở, đồng bộ UTC+7 mỗi giây. Đoàn tàu tự xuất hiện khi đến giờ khởi hành theo bảng công khai và ẩn sau giờ kết thúc theo lịch. Tọa độ được nội suy giữa các ga tham chiếu từ mốc giờ qua/đi ga và lý trình.

- **● Đang trực tiếp**: tự cập nhật mỗi giây, không cần bấm phát; nếu chuyển tab rồi quay lại, thời gian được đồng bộ lại với đồng hồ thật.
- **Thanh thời gian / ngày**: chuyển sang chế độ xem một thời điểm tùy chọn; lùi/tiến từng 30 phút.
- **1× · Giờ hiện tại** (mặc định): chọn trực tiếp trong hộp tốc độ để đồng bộ đồng hồ Việt Nam, vị trí theo lịch được tính lại mỗi giây.
- **60× / 300× / 900×**: chọn để bắt đầu tua nhanh từ thời điểm đang hiển thị; có thể tạm dừng và tiếp tục bằng nút phát/tạm dừng.
- **◉ Về hiện tại**: quay lại theo thời gian thực ở Việt Nam.
- Các đoàn cùng mác tàu nhưng xuất phát ở hai ngày khác nhau được quản lý theo **ngày khởi hành**; các mốc `+1`, `+2` tính đúng qua ngày.

**Quan trọng:** "Trực tiếp" chỉ có nghĩa là đồng bộ với đồng hồ Việt Nam; **không phải GPS trực tiếp hay xác nhận tàu thực đang vận hành**. Các tàu được giả định chạy mỗi ngày theo lịch tham khảo, không tính tàu tăng cường, tàu bị hủy, dừng chờ, đổi giờ hoặc chậm giờ. Bảng nguồn công khai chủ yếu cung cấp giờ đi/qua ga, không đủ để tái hiện chính xác thời gian dừng tàu. Nguồn: https://giotaugiave.dsvn.vn/giotau/thongnhat và https://giotaugiave.dsvn.vn/Default.aspx.

## VNR Scenario Lab — Bộ sinh dữ liệu GPS/ETA giả lập

**Giao diện điều khiển:** https://smartvnr.github.io/simulator.html

**Tệp chính:**
- [simulator.html](./simulator.html): bảng điều khiển và bản đồ GPS giả lập
- [simulator-core.js](./simulator-core.js): lõi mô phỏng thuần JavaScript, dùng trên trình duyệt và Node.js
- [simulator-ui.js](./simulator-ui.js): hiển thị, bộ điều khiển, cảnh báo, xuất dữ liệu
- [data/rail-schedules.json](./data/rail-schedules.json): 38 ga, 10 mác tàu, 239 đoạn giữa các mốc qua/đi ga
- [scripts/generate-telemetry.cjs](./scripts/generate-telemetry.cjs): chương trình tạo luồng JSON/CSV/NDJSON cho ứng dụng bên ngoài
- [tests/simulator.test.cjs](./tests/simulator.test.cjs): kiểm thử dữ liệu, tọa độ, ETA, sự cố và khả năng tái lập

### Kịch bản và trạng thái

Giao diện hỗ trợ 5 kịch bản: `normal` (thường), `urban` (giảm tốc gần đô thị/khu dân cư), `weather` (mưa lớn), `incident` (dừng chờ tín hiệu), `recovery` (chạy bù giờ). Có thể chọn mã ngẫu nhiên (seed) để tái tạo cùng kết quả.

Tàu có các pha `ACCELERATING`, `CRUISING`, `BRAKING`, `DWELL`, `STOPPED`; các trạng thái `RUNNING`, `APPROACHING`, `AT_STATION`, `INCIDENT`. Sự cố thủ công được chèn ngay tại vị trí chuyến đã chọn và làm tăng ETA các ga phía sau. Bảng giờ kế hoạch **không bị sửa**.

**Thông số tốc độ chỉ để thử nghiệm mô hình**, không phải quy định về tốc độ chạy tàu:
- Đô thị (`urban`): tối đa mô hình 65 km/h
- Khu dân cư (`residential`): 75 km/h
- Thưa dân cư (`rural`): 90 km/h

Phân loại khu vực hiện được xác định sơ bộ dựa theo khoảng cách tới các ga tham chiếu; **chưa có dữ liệu GIS chính xác về ranh giới đô thị, dân cư, giới hạn tốc độ hoặc hình học đường ray**. Mô hình dùng đường thẳng nội suy giữa các ga, không phải GPS đo được. Không dùng những giá trị này để điều hành chạy tàu hoặc đánh giá tuân thủ quy định an toàn.

### Lược đồ dữ liệu

Ví dụ các trường trong một bản ghi:
```json
{
  "synthetic": true,
  "source": "SYNTHETIC_SCHEDULE_MODEL",
  "gpsSynthetic": true,
  "trainId": "SE1",
  "tripKey": "SE1|2026-11-04",
  "departureDay": "2026-11-04",
  "isoTime": "2026-11-04T15:00:00.000Z",
  "lat": 20.1,
  "lon": 105.9,
  "lineKm": 150.42,
  "speedKmh": 48.5,
  "zone": "residential",
  "phase": "CRUISING",
  "status": "RUNNING",
  "previousStation": "Ninh Bình",
  "nextStation": "Thanh Hoá",
  "plannedNextMs": 0,
  "etaNextMs": 0,
  "delaySec": 0,
  "positionQuality": "INTERPOLATED_STATION_REFERENCE"
}
```

Các số trong ví dụ minh họa lược đồ, **không phải bản ghi hành trình thực**. Thời gian trong `isoTime` tính theo UTC, giao diện quy đổi UTC+7. Chênh lệch `delaySec` được tính từ ETA mô hình trừ giờ qua/đi ga theo kế hoạch. Tùy mô hình, giá trị âm biểu thị sớm và giá trị dương biểu thị trễ.

### Sinh dữ liệu bằng dòng lệnh (Node.js 18+)

Không cần cài thư viện ngoài:

```bash
npm test
node scripts/generate-telemetry.cjs --train SE1 --date 2026-11-04 --minutes 45 --step 10 --format json > se1.json
node scripts/generate-telemetry.cjs --train SE1 --date 2026-11-04 --scenario weather --incident 145:30 --minutes 90 --step 10 --format csv > se1-weather.csv
node scripts/generate-telemetry.cjs --live --step 1 --minutes 10 > telemetry.ndjson
```

`--live` phát các bản ghi theo đồng hồ thật mỗi `step` giây; nội dung vẫn hoàn toàn **giả lập**. Tệp NDJSON thuận tiện cho xử lý streaming, ingest hoặc tập huấn. Dữ liệu giả lập có cờ `synthetic: true` để tránh trộn vào GPS thật.

Trong trình duyệt, có thể đọc `window.VNR_Sim.snapshot()`, gọi `window.VNR_Sim.exportRecords(...)` hoặc lắng nghe sự kiện `vnr-synthetic-telemetry` mỗi giây. **Đây là API JavaScript nội bộ trên trang**, không phải HTTP API hay nguồn định vị thực tế.

### Các giới hạn cần giải quyết để phát triển phiên bản vận hành

1. Lịch gốc là giờ qua/đi ga công bố, không có giờ đến và dừng thực tế: thời gian dừng và tăng/giảm tốc được tổng hợp bằng mô hình.
2. Chỉ có các mốc ga tham chiếu, không có hình học tuyến ray khảo sát, tín hiệu, đường ngang, bản đồ hạn chế tốc độ hoặc dữ liệu phân loại khu vực thực.
3. Không có tín hiệu GPS đầu máy, sự kiện điều độ, cập nhật chậm/hủy tàu hoặc công bố đóng đường thời gian thực.
4. Giả định lịch trình lặp lại mỗi ngày; chưa phân biệt ngày tàu chạy/tàu không chạy hoặc thay đổi lịch theo mùa.
5. ETA ở đây là **kết quả dự báo giả lập theo mô hình**, không được công nhận là giờ đến tàu thật.

Nguồn thời gian tham khảo: https://giotaugiave.dsvn.vn/Default.aspx.
