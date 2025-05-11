const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("querystring");

const app = express();
const port = process.env.PORT || 3000;

const ACCESS_KEY = process.env.ACCESS_KEY_ACC1;
const SECRET_KEY = process.env.SECRET_KEY_ACC1;
const VENDOR_ID = process.env.VENDOR_ID_ACC1;

const COUPANG_DOMAIN = "https://api-gateway.coupang.com";

// ✅ 쿠팡 timestamp 포맷: yyyyMMdd'T'HHmmss'Z'
function getCoupangTimestamp() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const MM = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const HH = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${MM}${dd}T${HH}${mm}${ss}Z`;
}

app.get("/test-coupang", async (req, res) => {
  const method = "GET";
  const path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";
  const query = "?status=APPROVED&limit=10";

  // 🔐 timestamp
  const timestamp = getCoupangTimestamp();

  // ✅ 쿼리 파싱 및 정렬
  const queryObj = querystring.parse(query.replace(/^\?/, ""));
  const queryStr = `?${querystring.stringify(queryObj)}`;

  // ✅ 메시지 서명
  const message = timestamp + method + path + queryStr;

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("base64");

  // ✅ 헤더 구성
  const headers = {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`,
    "X-Requested-By": VENDOR_ID,
  };

  // ✅ API 호출
  try {
    const fullUrl = `${COUPANG_DOMAIN}${path}${queryStr}`;
    const response = await axios.get(fullUrl, { headers });
    res.status(200).json({ status: "success", data: response.data });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.response?.data || error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Coupang API proxy running on port ${port}`);
});
