const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const ACCESS_KEY = process.env.ACCESS_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const VENDOR_ID = process.env.VENDOR_ID;

console.log("🧾 ACCESS_KEY:", ACCESS_KEY);
console.log("🔐 SECRET_KEY:", SECRET_KEY);
console.log("🏢 VENDOR_ID:", VENDOR_ID);

app.get('/coupang/orders', async (req, res) => {
  const createdAtFrom = '2025-03-01T00:00:00';
  const createdAtTo = '2025-03-31T23:59:59';
  const method = 'GET';

  // ❗ URL path는 쿼리 없이, 서명용으로만 사용
  const urlPath = `/v2/providers/openapi/apis/api/v4/vendors/${VENDOR_ID}/ordersheets`;
  const fullUrl = `https://api-gateway.coupang.com${urlPath}`;
  const timestamp = Date.now().toString();

  // ✅ 메시지는 쿼리 없이 정확히 이 형식
  const message = method + ' ' + urlPath + '\n' + timestamp + '\n' + ACCESS_KEY;

  // 🔐 서명 생성
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('base64');

  // 🧾 디버깅 로그
  console.log('🧾 Signing message:\n' + message);
  console.log('🔐 Signature:', signature);
  console.log('🔑 Authorization:', `CEA ${ACCESS_KEY}:${signature}`);

  const headers = {
    Authorization: `CEA ${ACCESS_KEY}:${signature}`,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(fullUrl, {
      headers,
      params: {
        createdAtFrom,
        createdAtTo,
        status: 'ACCEPT',
        maxPerPage: 10,
        pageNum: 1
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Coupang API Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
