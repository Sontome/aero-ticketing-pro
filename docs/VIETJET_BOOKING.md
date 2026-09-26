# Vietjet Booking API



## Booking (Giữ vé)

### Endpoint

```text
POST https://apiapp.hanvietair.com/vj/booking
```

Không yêu cầu authentication (không có API key / token / cookie trong source code).

### cURL

```bash
curl -X POST "https://apiapp.hanvietair.com/vj/booking" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "ds_khach": {
      "người_lớn": [
        { "Họ": "NGUYEN", "Tên": "VAN A", "Hộ_chiếu": "B12345678" }
      ],
      "trẻ_em": [],
      "em_bé": []
    },
    "bookingkey": "...",
    "bookingkeychieuve": "...",
    "sochieu": "RT",
    "sanbaydi": "ICN",
    "iso": "VN",
    "exten": "84",
    "phone": "901234567",
    "email": "mail@example.com"
  }'
```

Với vé một chiều: `"sochieu": "OW"` và `"bookingkeychieuve": ""`.

### Request Body

```json
{
  "ds_khach": {
    "người_lớn": [
      { "Họ": "NGUYEN", "Tên": "VAN A", "Hộ_chiếu": "B12345678" }
    ],
    "trẻ_em": [],
    "em_bé": []
  },
  "bookingkey": "...",
  "bookingkeychieuve": "...",
  "sochieu": "RT",
  "sanbaydi": "ICN",
  "iso": "VN",
  "exten": "84",
  "phone": "901234567",
  "email": "mail@example.com"
}
```

### Parameters

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| ds_khach | object | Có | Danh sách hành khách, chia 3 nhóm |
| ds_khach.người_lớn[] | array | Có | Hành khách người lớn |
| ds_khach.trẻ_em[] | array | Có | Hành khách trẻ em (mảng rỗng nếu không có) |
| ds_khach.em_bé[] | array | Có | Hành khách em bé (mảng rỗng nếu không có) |
| ds_khach.*[].Họ | string | Có | Họ, viết HOA không dấu, **chỉ 1 từ** |
| ds_khach.*[].Tên | string | Có | Tên, viết HOA không dấu |
| ds_khach.*[].Hộ_chiếu | string | Có | Số hộ chiếu |
| bookingkey | string | Có | BookingKey chiều đi, lấy từ kết quả tìm kiếm chuyến bay |
| bookingkeychieuve | string | Có | BookingKey chiều về; gửi `""` khi `sochieu = "OW"` |
| sochieu | string | Có | `OW` (một chiều) hoặc `RT` (khứ hồi) |
| sanbaydi | string | Có | Mã sân bay đi (IATA) |
| iso | string | Có | Mã quốc gia theo đầu số điện thoại: `KR` nếu `exten = "82"`, ngược lại `VN` |
| exten | string | Có | Mã vùng điện thoại (2 chữ số), ví dụ `84` / `82` |
| phone | string | Có | Số điện thoại (không gồm mã vùng, bỏ dấu `+`) |
| email | string | Có | Email nhận vé |

Lưu ý từ source code:

- Họ và Tên được chuẩn hóa viết HOA không dấu trước khi gửi; `Họ` chứa dấu cách (nhiều hơn 1 từ) sẽ bị client từ chối.
- Em bé (`em_bé`) đi kèm một người lớn; thông tin em bé cùng cấu trúc `Họ` / `Tên` / `Hộ_chiếu`.
- Số điện thoại đầy đủ dạng `+<exten><phone>` được client tách thành `exten` + `phone`; nếu không khớp pattern thì mặc định `exten = "84"`.

### Response

```json
{
  "mã_giữ_vé": "ABC123",
  "hạn_thanh_toán": "...",
  "mess": ""
}
```

### Response fields

| Field | Type | Description |
| --- | --- | --- |
| mã_giữ_vé | string | Mã đặt chỗ (PNR); có giá trị = giữ vé thành công |
| hạn_thanh_toán | string | Hạn thanh toán / giữ chỗ |
| mess | string | Thông điệp / lý do lỗi khi không có `mã_giữ_vé` |

### Error response

Cấu trúc lỗi do server trả về: Chưa xác định từ source code hiện tại. Client xử lý:

- HTTP status khác 2xx → ném lỗi `HTTP error! status: <status>`.
- Response không có `mã_giữ_vé` → coi là thất bại, hiển thị `mess` (nếu có).
