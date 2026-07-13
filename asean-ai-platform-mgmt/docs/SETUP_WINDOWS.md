# Hướng dẫn cài đặt trên Windows (ổ E:)

Tài liệu này hướng dẫn cài đặt và chạy **ASEAN AI Platform — PM AI** trên máy Windows, đặt trong ổ E:.

---

## 1. Yêu cầu hệ thống

| Thành phần | Yêu cầu | Ghi chú |
| --- | --- | --- |
| OS | Windows 10 / 11 (x64) | |
| RAM | ≥ 8 GB | Khuyến nghị 16 GB |
| Disk | 5 GB trống | Trên ổ E: |
| Node.js | 20 LTS trở lên | https://nodejs.org |
| Python | 3.11 - 3.13 | https://www.python.org |
| Git | mới nhất | https://git-scm.com |
| Trình duyệt | Chrome / Edge / Firefox mới nhất | |

## 2. Cài đặt các phần mềm nền

### 2.1. Kiểm tra đã có sẵn chưa

Mở **PowerShell** và chạy:

```powershell
node --version    # cần >= v20
python --version  # cần 3.11+
git --version
```

Nếu bất kỳ lệnh nào báo lỗi hoặc phiên bản cũ, cài đặt theo bên dưới.

### 2.2. Cài Node.js 20 LTS

- Tải: https://nodejs.org/en/download (chọn **LTS**, Windows Installer .msi 64-bit)
- Cài với tùy chọn mặc định (nhớ tick "Add to PATH")
- Sau khi cài, đóng và mở lại PowerShell, kiểm tra `node --version`

Hoặc dùng **winget** (khuyến nghị):
```powershell
winget install OpenJS.NodeJS.LTS
```

### 2.3. Cài Python 3.11+

- Tải: https://www.python.org/downloads/
- **Quan trọng**: khi cài, tick **"Add python.exe to PATH"** ở màn hình đầu tiên.

Hoặc dùng winget:
```powershell
winget install Python.Python.3.12
```

### 2.4. Cài Git

- Tải: https://git-scm.com/download/win
- Hoặc: `winget install Git.Git`

## 3. Clone repo về ổ E:

Mở PowerShell:

```powershell
E:
mkdir E:\projects -ErrorAction SilentlyContinue
cd E:\projects
git clone https://github.com/trolydieuhanh-cmd/xpay.git
cd xpay
git checkout claude/asean-ai-platform-mgmt-zkcqaw
cd asean-ai-platform-mgmt
```

Sau bước này bạn sẽ đứng ở `E:\projects\xpay\asean-ai-platform-mgmt`.

## 4. Cấu hình biến môi trường

### 4.1. Backend

```powershell
cd backend
copy .env.example .env
notepad .env
```

Trong `.env`, sửa dòng:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

Lấy API key tại: https://console.anthropic.com/settings/keys

> **Lưu ý**: file `.env` KHÔNG được commit lên Git (đã có trong `.gitignore`).

## 5. Cài dependencies và chạy Backend

Trong PowerShell, tại `E:\projects\xpay\asean-ai-platform-mgmt\backend`:

```powershell
# Tạo Python virtual environment
python -m venv .venv

# Kích hoạt venv
.\.venv\Scripts\Activate.ps1

# Nếu bị chặn bởi Execution Policy, chạy lệnh sau (chỉ 1 lần):
# Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Cài thư viện
pip install --upgrade pip
pip install -r requirements.txt

# Chạy backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Mở trình duyệt: **http://127.0.0.1:8000/docs** — nếu thấy giao diện Swagger, backend đã chạy tốt.

## 6. Cài dependencies và chạy Frontend

**Mở PowerShell mới** (giữ terminal backend đang chạy), tại `E:\projects\xpay\asean-ai-platform-mgmt\frontend`:

```powershell
cd E:\projects\xpay\asean-ai-platform-mgmt\frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

Bạn sẽ thấy trang **Tổng quan** với các thẻ trạng thái. Chuyển sang tab **AI Chat** để thử trò chuyện.

## 7. Chạy nhanh bằng script

Script tự động cài + chạy: `scripts\setup.ps1` (xem trong thư mục `scripts/`)

```powershell
cd E:\projects\xpay\asean-ai-platform-mgmt
.\scripts\setup.ps1
```

## 8. Dừng và khởi động lại

- **Dừng**: Ctrl+C trong PowerShell của mỗi service.
- **Khởi động lại backend**:
  ```powershell
  cd E:\projects\xpay\asean-ai-platform-mgmt\backend
  .\.venv\Scripts\Activate.ps1
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  ```
- **Khởi động lại frontend**:
  ```powershell
  cd E:\projects\xpay\asean-ai-platform-mgmt\frontend
  npm run dev
  ```

## 9. Xử lý sự cố thường gặp

### `python` không phải là lệnh nhận dạng được
- Chưa tick "Add to PATH" khi cài Python. Cài lại và tick lại, hoặc thêm thủ công vào PATH.

### `Activate.ps1` bị chặn bởi Execution Policy
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### `uvicorn: command not found`
- Chưa kích hoạt venv. Chạy `.\.venv\Scripts\Activate.ps1` trước.

### Frontend không kết nối được backend
- Kiểm tra backend đang chạy ở cổng 8000.
- Kiểm tra `frontend/next.config.mjs` (mặc định proxy `/api` sang `http://localhost:8000`).

### `ANTHROPIC_API_KEY chưa được cấu hình`
- Kiểm tra `backend/.env` có dòng `ANTHROPIC_API_KEY=sk-ant-...`.
- Khởi động lại backend sau khi sửa `.env`.

### Cổng 3000 hoặc 8000 đã bị dùng
- Backend: `uvicorn ... --port 8001` rồi sửa `BACKEND_URL` trong `frontend/next.config.mjs`.
- Frontend: `npm run dev -- -p 3001`.

## 10. Cập nhật dự án

```powershell
cd E:\projects\xpay
git pull origin claude/asean-ai-platform-mgmt-zkcqaw
cd asean-ai-platform-mgmt\backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ..\frontend
npm install
```

## 11. Deploy production (tùy chọn)

Xem `docs/ARCHITECTURE.md` phần *Deploy* để biết cách chạy production trên Windows Server / Linux / Cloud.
