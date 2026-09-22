# Vietjet API

Nguồn: `src/services/lowfareService.ts`

## Low Fare V2

### Endpoint

```text
POST https://apiapp.hanvietair.com/vj/lowfare-v2
```

Không yêu cầu authentication (không có API key / token / cookie trong source code).

### cURL

```bash
curl -X POST "https://apiapp.hanvietair.com/vj/lowfare-v2" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "departure": "ICN",
    "arrival": "SGN",
    "sochieu": "RT",
    "departure_date": "2026-10-10",
    "return_date": "2026-10-20"
  }'
```

Với vé một chiều (`sochieu: "OW"`), `return_date` được gửi là chuỗi rỗng `""`.

### Request Body

```json
{
  "departure": "ICN",
  "arrival": "SGN",
  "sochieu": "RT",
  "departure_date": "2026-10-10",
  "return_date": "2026-10-20"
}
```

### Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| departure | string | Có | Mã sân bay đi (IATA) |
| arrival | string | Có | Mã sân bay đến (IATA) |
| sochieu | string | Có | `OW` (một chiều) hoặc `RT` (khứ hồi) |
| departure_date | string | Có | Ngày đi |
| return_date | string | Có | Ngày về; gửi `""` khi `sochieu = "OW"` |

### Response

```json
{
  "status_code": "200",
  "message": "OK",
  "body": {
    "chiều_đi": [
      {
        "ngày": "2026-10-10",
        "giá_vé_gốc": 250000,
        "loại_vé": "Eco"
      }
    ],
    "chiều_về": [
      {
        "ngày": "2026-10-20",
        "giá_vé_gốc": 270000,
        "loại_vé": "Eco"
      }
    ]
  }
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| status_code | string | Mã trạng thái trả về |
| message | string | Thông điệp trả về |
| body.chiều_đi[] | array | Danh sách giá theo ngày, chiều đi |
| body.chiều_về[] | array | Danh sách giá theo ngày, chiều về (rỗng khi OW) |
| body.*[].ngày | string | Ngày bay |
| body.*[].giá_vé_gốc | number | Giá vé gốc |
| body.*[].loại_vé | string | Hạng/loại vé |

### Error response

API không trả cấu trúc lỗi riêng trong source code. Khi lỗi kết nối, client tự dựng:

```json
{
  "status_code": "500",
  "message": "Lỗi kết nối API",
  "body": { "chiều_đi": [], "chiều_về": [] }
}
```

Cấu trúc lỗi do server trả về: Chưa xác định từ source code hiện tại.
