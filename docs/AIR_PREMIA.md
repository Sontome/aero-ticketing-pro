# Air Premia API

Nguồn: `src/services/premiaService.ts`

## Check Vé V3

### Endpoint

```text
POST https://apiapp.hanvietair.com/premia/check-ve-v3
```

Không yêu cầu authentication (không có API key / token / cookie trong source code).

### cURL

```bash
curl -X POST "https://apiapp.hanvietair.com/premia/check-ve-v3" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "adt": "1",
    "chd": "0",
    "inf": "0",
    "dep0": "ICN",
    "arr0": "SGN",
    "depdate0": "2026-10-10",
    "sochieu": "RT",
    "depdate1": "2026-10-20"
  }'
```

Với một chiều: `"sochieu": "OW"` và `"depdate1": ""`.

### Request Body

```json
{
  "adt": "1",
  "chd": "0",
  "inf": "0",
  "dep0": "ICN",
  "arr0": "SGN",
  "depdate0": "2026-10-10",
  "sochieu": "RT",
  "depdate1": "2026-10-20"
}
```

### Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| adt | string | Có | Số người lớn |
| chd | string | Có | Số trẻ em |
| inf | string | Có | Số em bé |
| dep0 | string | Có | Sân bay đi (IATA) |
| arr0 | string | Có | Sân bay đến (IATA) |
| depdate0 | string | Có | Ngày đi |
| sochieu | string | Có | `OW` hoặc `RT` |
| depdate1 | string | Có | Ngày về; `""` khi `OW` |

### Response

```json
{
  "status_code": 200,
  "session_key": "...",
  "trạng_thái": "adjacent",
  "body": [
    {
      "chiều_đi": {
        "hãng": "YP",
        "id": "...",
        "nơi_đi": "ICN",
        "nơi_đến": "SGN",
        "giờ_cất_cánh": "09:30",
        "ngày_cất_cánh": "2026-10-10",
        "thời_gian_bay": "5h30m",
        "thời_gian_chờ": "",
        "giờ_hạ_cánh": "13:00",
        "ngày_hạ_cánh": "2026-10-10",
        "số_hiệu_máy_bay": "YP731",
        "số_điểm_dừng": "0",
        "điểm_dừng_1": "",
        "điểm_dừng_2": "",
        "loại_vé": "YL",
        "giá_vé_gốc": 250000,
        "BookingKey": "..."
      },
      "chiều_về": { "...": "cùng cấu trúc chiều_đi, chỉ có khi RT" },
      "thông_tin_chung": {
        "giá_vé": "500000",
        "giá_vé_gốc": "480000",
        "phí_nhiên_liệu": "0",
        "thuế_phí_công_cộng": "20000",
        "số_ghế_còn": "9",
        "hành_lý_vna": "YL"
      }
    }
  ]
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| status_code | number | Mã trạng thái |
| session_key | string | Khóa phiên tìm kiếm |
| trạng_thái | string | Trạng thái kết quả; giá trị `adjacent` = vé tham khảo (ngày lân cận) |
| body[] | array | Danh sách hành trình |
| body[].chiều_đi | object | Thông tin chặng đi (xem bảng dưới) |
| body[].chiều_về | object | Thông tin chặng về, chỉ có khi `RT` |
| body[].thông_tin_chung.giá_vé | string/number | Giá vé hiển thị |
| body[].thông_tin_chung.giá_vé_gốc | string/number | Giá vé gốc |
| body[].thông_tin_chung.phí_nhiên_liệu | string/number | Phí nhiên liệu |
| body[].thông_tin_chung.thuế_phí_công_cộng | string/number | Thuế phí |
| body[].thông_tin_chung.số_ghế_còn | string/number | Số ghế còn |
| body[].thông_tin_chung.hành_lý_vna | string | Gói hành lý: `YL` / `YS` |

Chặng bay (`chiều_đi` / `chiều_về`):

| Field | Type | Description |
| --- | --- | --- |
| hãng | string | Mã hãng |
| id | string | Mã định danh chặng |
| nơi_đi / nơi_đến | string | Sân bay đi / đến |
| giờ_cất_cánh / ngày_cất_cánh | string | Thời điểm khởi hành |
| giờ_hạ_cánh / ngày_hạ_cánh | string | Thời điểm hạ cánh |
| thời_gian_bay | string | Thời gian bay |
| thời_gian_chờ | string | Thời gian chờ nối chuyến |
| số_hiệu_máy_bay | string | Số hiệu chuyến bay |
| số_điểm_dừng | string | Số điểm dừng |
| điểm_dừng_1 / điểm_dừng_2 | string | Điểm dừng (nếu có) |
| loại_vé | string | Hạng vé |
| giá_vé_gốc | number | Giá vé gốc của chặng |
| BookingKey | string | Khóa dùng cho bước đặt vé |

### Error response

Cấu trúc lỗi do server trả về: Chưa xác định từ source code hiện tại. Client coi HTTP status khác 2xx là lỗi và dựng:

```json
{ "status_code": 500, "body": [], "error": "HTTP 500" }
```
