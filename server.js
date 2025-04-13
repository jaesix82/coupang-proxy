// server.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const puppeteer = require('puppeteer');

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
    SECRET_KEY: process.env.SECCESS_KEY_ACC3,
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

// 쿠팡 검색결과 크롤링 엔드포인트
app.get('/crawl/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query parameter: q' });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36'
    );

    const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}&channel=user`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

    const data = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.search-product')).slice(0, 40);
      return items.map(item => {
        const title = item.querySelector('.name')?.innerText || '';
        const price = item.querySelector('.price-value')?.innerText || '';
        const rating = item.querySelector('.rating')?.innerText || '';
        const reviewCount = item.querySelector('.rating-total-count')?.innerText?.replace(/[()]/g, '') || '';
        const image = item.querySelector('img')?.src || '';
        const link = item.querySelector('a.search-product-link')?.href || '';
        const deliveryTag = item.querySelector('.delivery-info')?.innerText ||
                            item.querySelector('.badge.rocket')?.innerText || '';

        return { title, price, rating, reviewCount, deliveryTag, image, link };
      });
    });

    await browser.close();
    res.json(data);
  } catch (err) {
    console.error('[Crawl Error]', err);
    res.status(500).json({ error: 'Failed to crawl Coupang search results.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
