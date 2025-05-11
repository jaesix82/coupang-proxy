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

// ✅ 쿠팡 사양에 맞는 signed-date 포맷: YYMMDDTHHmmssZ
function getSignedDate() {
  return new Date()
    .toISOString()
    .substr(2, 17)               // 25-05-11T09:11:00
    .replace(/:/g, '')
    .replace(/-/g, '') + 'Z';    // 250511T091100Z
}

// ✅ Render IP 확인용
app.get("/ip", async (req, res) => {
  try {
    const response = await axios.get("https://ifconfig.me/ip");
    res.send(`🌐 Render 서버의 공인 IP: ${response.data}`);
  } catch (err) {
    res.status(500).send("❌ 공인 IP를 가져오지 못했습니다.");
  }
});

// ✅ 쿠팡 API 호출 테스트
app.get("/test-coupang", async (req, res) => {
  const method = "GET";
  const path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";
  const query = `status=APPROVED&limit=10&vendorId=${VENDOR_ID}`;

  const queryObj = querystring.parse(query);
  const queryStr = `?${querystring.stringify(queryObj)}`;
  const timestamp = getSignedDate();

  const message = timestamp + method + path + query;

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("hex");  // ← 공식은 hex

  const authorization =
    `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`;

  const headers = {
    Authorization: authorization,
    "X-Requested-By": VENDOR_ID,
    "Content-Type": "application/json",
  };

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
  console.log(`🚀 Coupang Proxy Server running on port ${port}`);
});
