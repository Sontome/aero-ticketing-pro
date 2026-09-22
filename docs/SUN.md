# SUN Airways (SunPQ) API



Flow: gọi **Check Vé V3** để lấy hành trình, sau đó lấy mảng `list_itinerary` của `chiều_đi` (và `chiều_về` nếu khứ hồi), nối lại và gửi nguyên vẹn sang **Booking** kèm danh sách hành khách và thông tin liên hệ.

---

## 1. Check Vé V3

### Endpoint

```text
POST https://apiapp.hanvietair.com/spa/check-ve-v3
```

Không yêu cầu authentication (không có API key / token / cookie trong source code).

### cURL

```bash
curl -X POST "https://apiapp.hanvietair.com/spa/check-ve-v3" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "departure": "ICN",
    "arrival": "SGN",
    "dep_date": "2026-10-10",
    "trip_type": "RT",
    "adt": 1,
    "chd": 0,
    "inf": 0,
    "promo_code": "",
    "currency": "KRW",
    "arr_date": "2026-10-20"
  }'
```

Với một chiều: `"trip_type": "OW"` và **không gửi** trường `arr_date`.

### Request Body

```json
{
  "departure": "ICN",
  "arrival": "SGN",
  "dep_date": "2026-10-10",
  "trip_type": "RT",
  "adt": 1,
  "chd": 0,
  "inf": 0,
  "promo_code": "",
  "currency": "KRW",
  "arr_date": "2026-10-20"
}
```

### Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| departure | string | Có | Sân bay đi (IATA) |
| arrival | string | Có | Sân bay đến (IATA) |
| dep_date | string | Có | Ngày đi |
| trip_type | string | Có | `OW` hoặc `RT` |
| adt | number | Có | Số người lớn |
| chd | number | Có | Số trẻ em |
| inf | number | Có | Số em bé |
| promo_code | string | Có | Mã khuyến mãi, để `""` nếu không có |
| currency | string | Có | Đơn vị tiền, dùng `KRW` |
| arr_date | string | Chỉ khi `RT` | Ngày về; không gửi khi `OW` |

### Response

```json
{
  "success": true,
  "data": {
    "body": [
      {
        "chiều_đi": {
          "hãng": "9G",
          "nơi_đi": "ICN",
          "nơi_đến": "SGN",
          "giờ_cất_cánh": "09:30",
          "ngày_cất_cánh": "2026-10-10",
          "thời_gian_bay": "5h30m",
          "giờ_hạ_cánh": "13:00",
          "ngày_hạ_cánh": "2026-10-10",
          "số_hiệu_máy_bay": "9G101",
          "số_điểm_dừng": "0",
          "điểm_dừng_1": "",
          "loại_vé": "V",
          "giá_vé_gốc": 250000,
          "BookingKey": "...",
          "list_itinerary": [
            {
              "trip_id": 1,
              "segment_id": 1,
              "departure": "ICN",
              "arrival": "SGN",
              "flight_date": "2026-10-10",
              "flight_number": 101,
              "elapse_flying_time": "330",
              "duration": "5:30",
              "carrier": "9G",
              "booking_class": "V",
              "fare_basis": "VOW",
              "break_point": "",
              "flight_status": "NN"
            }
          ]
        },
        "chiều_về": { "...": "cùng cấu trúc chiều_đi, chỉ có khi RT" },
        "thông_tin_chung": {
          "giá_vé": "500000",
          "giá_vé_gốc": "480000",
          "số_ghế_còn": "9"
        }
      }
    ],
    "lowerfare": { "chiều_đi": [], "chiều_về": [], "currency": "KRW" }
  }
}
```

Client chấp nhận cả dạng phẳng: `body` và `lowerfare` nằm ở cấp gốc thay vì trong `data`.

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| success | boolean | `true` = tìm thấy kết quả |
| data.body[] | array | Danh sách hành trình |
| data.body[].chiều_đi / chiều_về | object | Chặng đi / về |
| data.body[].chiều_*.list_itinerary[] | array | Dữ liệu segment thô, **bắt buộc dùng lại khi Booking** |
| data.body[].thông_tin_chung.giá_vé | string/number | Giá vé hiển thị |
| data.body[].thông_tin_chung.giá_vé_gốc | string/number | Giá vé gốc |
| data.body[].thông_tin_chung.số_ghế_còn | string/number | Số ghế còn |
| data.lowerfare | object/null | Bảng giá rẻ theo ngày (`chiều_đi`, `chiều_về`, `currency`) |

Segment trong `list_itinerary`:

| Field | Type | Description |
| --- | --- | --- |
| trip_id | number | Mã hành trình |
| segment_id | number | Mã chặng |
| departure / arrival | string | Sân bay đi / đến |
| flight_date | string | Ngày bay |
| flight_number | number | Số hiệu chuyến |
| carrier | string | Mã hãng |
| booking_class | string | Hạng đặt chỗ |
| fare_basis | string | Fare basis |
| elapse_flying_time | string | Thời gian bay |
| duration | string | Thời lượng |
| break_point | string | Điểm dừng |
| flight_status | string | Trạng thái chuyến |

### Error response

Cấu trúc lỗi do server trả về: Chưa xác định từ source code hiện tại. Client xử lý: HTTP khác 2xx → lỗi; `success != true` → coi như không có kết quả (`status_code 404`).

---

## 2. Booking 

### Endpoint

```text
POST https://apiapp.hanvietair.com/spa/booking
```

Không yêu cầu authentication (không có API key / token / cookie trong source code).

### cURL

```bash
curl -X POST "https://apiapp.hanvietair.com/spa/booking" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "list_itinerary": [
      {
        "trip_id": 1,
        "segment_id": 1,
        "departure": "ICN",
        "arrival": "SGN",
        "flight_date": "2026-10-10",
        "flight_number": 101,
        "elapse_flying_time": "330",
        "duration": "5:30",
        "carrier": "9G",
        "booking_class": "V",
        "fare_basis": "VOW",
        "break_point": "",
        "flight_status": "NN"
      }
    ],
    "list_passenger": [
      {
        "pax_id": 1,
        "type": "ADULT",
        "title": "MR",
        "first_name": "VAN A",
        "last_name": "NGUYEN",
        "parent_id": null
      },
      {
        "pax_id": 2,
        "type": "INFANT",
        "title": "MSTR",
        "first_name": "BE",
        "last_name": "NGUYEN",
        "parent_id": 1,
        "date_of_birth": "2025-05-01"
      }
    ],
    "contact_info": {
      "full_name": "Hanvietair",
      "email": "mail@example.com",
      "phone_number": "01012345678"
    },
    "promo_code": "",
    "corporate_code": "",
    "currency": "KRW",
    "send_email": true
  }'
```

### Request Body

Xem cURL phía trên (gửi nguyên cấu trúc đó).

### Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| list_itinerary | array | Có | Gộp `list_itinerary` của `chiều_đi` + `chiều_về` lấy từ Check Vé V3, giữ nguyên giá trị |
| list_passenger | array | Có | Danh sách hành khách |
| list_passenger[].pax_id | number | Có | Số thứ tự hành khách, bắt đầu từ 1 |
| list_passenger[].type | string | Có | `ADULT` / `CHILD` / `INFANT` |
| list_passenger[].title | string | Có | `MR` / `MRS` / `MSTR` / `MISS` |
| list_passenger[].first_name | string | Có | Tên, viết HOA không dấu |
| list_passenger[].last_name | string | Có | Họ, viết HOA không dấu (một từ) |
| list_passenger[].parent_id | number/null | Có | `pax_id` của người lớn đi kèm với `INFANT`; `null` với người lớn |
| list_passenger[].date_of_birth | string | Với CHILD/INFANT | Ngày sinh |
| contact_info.full_name | string | Có | Tên liên hệ |
| contact_info.email | string | Có | Email liên hệ |
| contact_info.phone_number | string | Có | Số điện thoại liên hệ |
| promo_code | string | Có | Để `""` nếu không có |
| corporate_code | string | Có | Để `""` nếu không có |
| currency | string | Có | `KRW` |
| send_email | boolean | Có | Gửi email xác nhận |

### Response

```json
{
  "success": true,
  "pnr": "ABC123",
  "message": ""
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| success | boolean | Kết quả xử lý |
| pnr | string | Mã đặt chỗ; có `pnr` = giữ vé thành công |
| message | string | Thông điệp / lý do lỗi |

### Error response

HTTP khác 2xx, body dạng:

```json
{ "message": "..." }
```

Client ném lỗi với `message`, nếu thiếu thì dùng `HTTP <status>`.
