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
  "message": "Thành công",
  "body": {
    "chiều_đi": [
      {
        "ngày": "01/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "02/10/2026",
        "giá_vé_gốc": 475305,
        "loại_vé": "N1ECO"
      },
      {
        "ngày": "03/10/2026",
        "giá_vé_gốc": 261285,
        "loại_vé": "H1ECO"
      },
      {
        "ngày": "04/10/2026",
        "giá_vé_gốc": 670207,
        "loại_vé": "R1ECO"
      },
      {
        "ngày": "05/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "06/10/2026",
        "giá_vé_gốc": 20711,
        "loại_vé": "E1ECO"
      },
      {
        "ngày": "07/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "08/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "09/10/2026",
        "giá_vé_gốc": 308550,
        "loại_vé": "K1ECO"
      },
      {
        "ngày": "10/10/2026",
        "giá_vé_gốc": 79129,
        "loại_vé": "W1ECO"
      },
      {
        "ngày": "11/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "12/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "13/10/2026",
        "giá_vé_gốc": 20711,
        "loại_vé": "E1ECO"
      },
      {
        "ngày": "14/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "15/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "16/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "17/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "18/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "19/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "20/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "21/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "22/10/2026",
        "giá_vé_gốc": 20711,
        "loại_vé": "E1ECO"
      },
      {
        "ngày": "23/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "24/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "25/10/2026",
        "giá_vé_gốc": 261285,
        "loại_vé": "H1ECO"
      },
      {
        "ngày": "26/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "27/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "28/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "29/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "30/10/2026",
        "giá_vé_gốc": 20711,
        "loại_vé": "E1ECO"
      },
      {
        "ngày": "31/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      }
    ],
    "chiều_về": [
      {
        "ngày": "01/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "02/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "03/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "04/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "05/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "06/10/2026",
        "giá_vé_gốc": 261285,
        "loại_vé": "H1ECO"
      },
      {
        "ngày": "07/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "08/10/2026",
        "giá_vé_gốc": 308550,
        "loại_vé": "K1ECO"
      },
      {
        "ngày": "09/10/2026",
        "giá_vé_gốc": 137546,
        "loại_vé": "J1ECO"
      },
      {
        "ngày": "10/10/2026",
        "giá_vé_gốc": 537440,
        "loại_vé": "O1ECO"
      },
      {
        "ngày": "11/10/2026",
        "giá_vé_gốc": 261285,
        "loại_vé": "H1ECO"
      },
      {
        "ngày": "12/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "13/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "14/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "15/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "16/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "17/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "18/10/2026",
        "giá_vé_gốc": 79129,
        "loại_vé": "W1ECO"
      },
      {
        "ngày": "19/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "20/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "21/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "22/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "23/10/2026",
        "giá_vé_gốc": 79129,
        "loại_vé": "W1ECO"
      },
      {
        "ngày": "24/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "25/10/2026",
        "giá_vé_gốc": 79129,
        "loại_vé": "W1ECO"
      },
      {
        "ngày": "26/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "27/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "28/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "29/10/2026",
        "giá_vé_gốc": 36643,
        "loại_vé": "A1ECO"
      },
      {
        "ngày": "30/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
      },
      {
        "ngày": "31/10/2026",
        "giá_vé_gốc": 54168,
        "loại_vé": "Z1ECO"
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
