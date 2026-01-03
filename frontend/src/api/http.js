import axios from "axios";

const http = axios.create({
  baseURL: "/api",                 // ✅ 走前端代理，避免浏览器 CORS
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (!body || typeof body !== "object" || !("code" in body)) return body;
    if (body.code === 200) return body;
    return Promise.reject(new Error(body.msg || "请求失败"));
  },
  (err) => Promise.reject(err)
);

export default http;
