const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3000;

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;
const VENDOR_ID = process.env.COUPANG_VENDOR_ID;

const COUPANG_DOMAIN = "https://api-gateway.coupang.com";

app.get("/test-coupang", async (req, res) => {
  const method = "GET";
  const urlPath = "/v2/providers/seller_api/apis/api/v1/marketplace/meta-category";
  const timestamp = String(Date.now());

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(timestamp + method + urlPath)
    .digest("base64");

  const headers = {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`,
    "X-Requested-By": VENDOR_ID,
  };

  try {
    const response = await axios.get(`${COUPANG_DOMAIN}${urlPath}`, { headers });
    res.status(200).json({ status: "success", data: response.data });
  } catch (error) {
    res.status(500).json({ status: "fail", message: error.response?.data || error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
