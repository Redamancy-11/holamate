# Deploy HanoMate

## Docker deployment

1. Build image:
   ```bash
   docker build -t hanomate-app .
   ```
2. Run container:
   ```bash
   docker run -d -p 5000:5000 --env-file backend/.env -e NODE_ENV=production hanomate-app
   ```
3. Truy cập:
   - Backend API: `http://localhost:5000/api`
   - Frontend: `http://localhost:5000`

## Biến môi trường cần thiết

- `MONGODB_URI`: URI MongoDB
- `GEMINI_API_KEY`: API key Google Generative AI
- `JWT_SECRET`: khóa JWT
- `BACKEND_URL`: URL backend cho OAuth redirects
- `CLIENT_URL`: URL frontend cho OAuth redirects

## Nếu deploy trên nền tảng cloud

- Tải source lên GitHub
- Dùng Docker registry / cloud provider support Docker
- Đặt biến môi trường tương tự ở môi trường cloud
- Nếu dùng nền tảng khác, chỉ cần deploy container image `hanomate-app`

## Deploy lên Render

1. Push repo lên GitHub hoặc GitLab.
2. Tạo service mới trên Render kiểu `Web Service`.
3. Chọn Git repo và branch `main`.
4. Chọn `Docker` làm môi trường và giữ `DockerfilePath` là `Dockerfile`.
5. Thêm biến môi trường trong Render:
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `BACKEND_URL` = `https://<your-render-service>.onrender.com`
   - `CLIENT_URL` = `https://<your-render-service>.onrender.com`
6. Nếu cần OAuth social login, cũng thêm:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
   - `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`
7. Render sẽ build Docker image và khởi chạy app.

## Deploy frontend và backend tách biệt

- Deploy backend lên dịch vụ Node (Render, Railway, Heroku, Fly.io, v.v.)
- Deploy frontend lên Vercel / Netlify / Cloudflare Pages
- Trên frontend, đặt `VITE_API_URL` thành URL backend thực tế
- Trên backend, đặt các biến `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`, `BACKEND_URL`, `CLIENT_URL`
