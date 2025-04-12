const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 계정별 환경변수 설정
const ACCOUNTS = {
  acc1: {
    ACCESS_KEY: process.env.ACCESS_KEY_ACC1,
    SECRET_KEY: process.env.SECRET_KEY_ACC1,
    VENDOR_ID: process.env.VENDOR_ID_ACC1
  },
  acc2: {
    ACCESS_KEY: process.env.ACCESS_KEY_ACC2,
    SECRET_KEY: process.env.SECRET_KEY_ACC2,
    VENDOR_ID: process.env.VENDOR_ID_ACC2
  },
  acc3: {
    ACCESS_KEY: process.env.ACCESS_KEY_ACC3,
    SECRET_KEY: process.env.SECRET_KEY_ACC3,
    VENDOR_ID: process.env.VENDOR_ID_ACC3
  }
};

// 정적 파일 서빙 (public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 주문조회 API 엔드포인트
app.get('/coupang/orders', async (req, res) => {
  const accountKey = req.query.account || 'acc1';
  const account = ACCOUNTS[accountKey];

  if (!account) {
    return res.status(400).json({ error: `Invalid account: ${accountKey}` });
  }

  const { ACCESS_KEY, SECRET_KEY, VENDOR_ID } = account;

  const createdAtFrom = '2025-03-01T00:00:00';
  const createdAtTo = '2025-03-31T23:59:59';
  const method = 'GET';
  const urlPath = `/v2/providers/openapi/apis/api/v4/vendors/${VENDOR_ID}/ordersheets`;
  const timestamp = Date.now().toString();
  const message = `${method}\n${urlPath}\n${timestamp}\n${ACCESS_KEY}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');

  const headers = {
    Authorization: `CEA ${ACCESS_KEY}:${signature}`,
    'X-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };

  console.log(`🧾 Account: ${accountKey}`);
  console.log(`🔑 Authorization: CEA ${ACCESS_KEY}:${signature}`);
  console.log(`📤 Requesting: ${urlPath}`);

  try {
    const response = await axios.get(`https://api-gateway.coupang.com${urlPath}`, {
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
  console.log(`🚀 Server is running on port ${PORT}`);
});
