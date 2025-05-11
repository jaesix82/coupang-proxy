const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("querystring");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;

// 환경변수
const ACCESS_KEY = process.env.ACCESS_KEY_ACC1;
const SECRET_KEY = process.env.SECRET_KEY_ACC1;
const VENDOR_ID = process.env.VENDOR_ID_ACC1;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COUPANG_DOMAIN = "https://api-gateway.coupang.com";

// Supabase 클라이언트 설정
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// signed-date 포맷
function getSignedDate() {
  return new Date().toISOString().substr(2, 17).replace(/:/g, "").replace(/-/g, "") + "Z";
}

// 쿠팡 매출 데이터 조회 + Supabase에 저장
app.get("/fetch-revenue", async (req, res) => {
  const method = "GET";
  const path = "/v2/providers/openapi/apis/api/v1/revenue-history";
  const query = `vendorId=${VENDOR_ID}&recognitionDateFrom=2024-12-01&recognitionDateTo=2024-12-31&token=&maxPerPage=50`;

  const timestamp = getSignedDate();
  const message = timestamp + method + path + query;
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(message).digest("hex");

  const headers = {
    Authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`,
    "Content-Type": "application/json",
  };

  try {
    const fullUrl = `${COUPANG_DOMAIN}${path}?${query}`;
    const response = await axios.get(fullUrl, { headers });

    const rows = [];

    for (const record of response.data.data) {
      const { recognitionDate, saleType, orderId } = record;
      const items = record.items || [];

      for (const item of items) {
        rows.push({
          vendor_id: VENDOR_ID,
          recognition_date: recognitionDate,
          sale_type: saleType,
          order_id: orderId,
          vendor_item_id: item.vendorItemId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          sale_price: item.salePrice,
          sale_amount: item.saleAmount,
          service_fee: item.serviceFee,
          service_fee_vat: item.serviceFeeVat,
          settlement_amount: item.settlementAmount,
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("sales_raw").insert(rows);
      if (error) throw error;
    }

    res.status(200).json({ status: "success", inserted: rows.length });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Coupang Proxy Server running on port ${port}`);
});
