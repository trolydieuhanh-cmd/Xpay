# XPAY Chat Native API Contract

Tai lieu nay la hop dong toi thieu de Android/iOS native dung lai backend hien tai. Tat ca request la `POST`, content type `application/json`. Neu da dang nhap, gui header `Authorization: Bearer <token>`.

Base production: `https://gatewayxpay.com`

## Auth

### `/api/auth/login`

Body:

```json
{
  "phone": "0902815111",
  "password": "MatKhau@123"
}
```

Response:

```json
{
  "token": "session-token",
  "user": {
    "accountPhone": "0902815111",
    "fullName": "Ten nguoi dung",
    "email": "user@example.com",
    "presenceStatus": "Online"
  },
  "friends": [],
  "ai": {}
}
```

### `/api/session/restore`

Body: `{}`. Dung de mo lai ung dung bang token da luu.

### `/api/session/logout`

Body:

```json
{
  "deviceId": "native-device-id"
}
```

## Dong bo chinh

### `/api/sync`

Body: `{}`.

Response gom:

- `user`: thong tin chu tai khoan.
- `friends`: danh sach ban be.
- `conversations`: hoi thoai va tin nhan.
- `posts`: nhat ky.
- `calls`: cuoc goi dang co lien quan.
- `nearby`: nguoi dung quanh day.
- `ai`: trang thai XPAY AI.
- `aiModel`: provider AI hien dang dung.

## Ban be

### `/api/friends/add`

Body:

```json
{
  "phone": "09xxxxxxxx"
}
```

Response: `{ "friend": {} }`.

### `/api/friends/list`

Body: `{}`. Response: `{ "friends": [] }`.

## Tin nhan

### `/api/messages/send`

Body text:

```json
{
  "friendPhone": "09xxxxxxxx",
  "message": {
    "text": "Noi dung tin nhan",
    "time": "13:30"
  }
}
```

Body media:

```json
{
  "friendPhone": "09xxxxxxxx",
  "message": {
    "text": "",
    "media": {
      "kind": "image",
      "name": "photo.jpg",
      "mime": "image/jpeg",
      "data": "data:image/jpeg;base64,..."
    }
  }
}
```

### `/api/messages/delete`

Body:

```json
{
  "friendPhone": "09xxxxxxxx",
  "messageId": "msg-id"
}
```

### `/api/messages/recall`

Body:

```json
{
  "friendPhone": "09xxxxxxxx",
  "messageId": "msg-id"
}
```

## Goi dien va video call

### `/api/calls/start`

Body:

```json
{
  "friendPhone": "09xxxxxxxx",
  "mode": "voice"
}
```

`mode` co the la `voice` hoac `video`.

### `/api/calls/respond`

Body:

```json
{
  "id": "call-id",
  "action": "accept"
}
```

`action`: `accept`, `reject`, `end`, `ice-failed`.

### `/api/calls/signal`

Body:

```json
{
  "id": "call-id",
  "type": "offer",
  "payload": {}
}
```

`type`: `offer`, `answer`, `candidate`.

## XPAY AI

### `/api/ai/assistant`

Body:

```json
{
  "prompt": "Hom nay thoi tiet va lich cua toi nhu the nao?"
}
```

Response:

```json
{
  "answer": "Cau tra loi cua XPAY AI",
  "ai": {},
  "live": {},
  "aiModel": {}
}
```

### `/api/ai/rules/update`

Body:

```json
{
  "rules": {
    "autoReply": true,
    "allowContext": true
  }
}
```

## Push native

### `/api/push/status`

Body: `{}`. Native chi dang ky FCM/APNs khi server bao da cau hinh.

### `/api/push/register`

Body:

```json
{
  "token": "fcm-or-apns-token",
  "platform": "android",
  "deviceId": "native-device-id"
}
```

## Vi tri va quanh day

### `/api/location/update`

Body:

```json
{
  "enabled": true,
  "latitude": 10.7769,
  "longitude": 106.7009
}
```

### `/api/nearby/list`

Body: `{}`.
