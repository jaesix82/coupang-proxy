const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("querystring");
const { createClient } = require("@supabase/supabase-js");

const app = express(); // ✅ 빠졌던 부분!

app.use(express.static("public"));

const port = process.env.PORT || 3000;

const ACCESS_KEY = process.env.ACCESS_KEY_ACC1;
const SECRET_KEY = process.env.SECRET_KEY_ACC1;
const VENDOR_ID = process.env.VENDOR_ID_ACC1;

const COUPANG_DOMAIN = "https://api-gateway.coupang.com";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 쿠팡 시그니처 생성용 타임스탬프
function getSignedDate() {
  return new Date()
    .toISOString()
    .substr(2, 17)
    .replace(/:/g, "")
    .replace(/-/g, "") + "Z";
}

// ✅ 매출 데이터 받아서 Supabase에 업로드
app.get("/fetch-revenue", async (req, res) => {
  const { recognitionDateFrom, recognitionDateTo } = req.query;

  if (!recognitionDateFrom || !recognitionDateTo) {
    return res.status(400).json({
      status: "fail",
      message: "recognitionDateFrom, recognitionDateTo 쿼리 파라미터가 필요합니다.",
    });
  }

  const method = "GET";
  const path = "/v2/providers/openapi/apis/api/v1/revenue-history";
  let token = "";
  let hasMore = true;
  let insertedCount = 0;

  const allRecords = [];

  while (hasMore) {
    const query = `vendorId=${VENDOR_ID}&recognitionDateFrom=${recognitionDateFrom}&recognitionDateTo=${recognitionDateTo}&token=${token}&maxPerPage=50`;
    const timestamp = getSignedDate();
    const message = timestamp + method + path + query;

    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(message)
      .digest("hex");

    const authorization = `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`;
    const headers = {
      Authorization: authorization,
      "Content-Type": "application/json",
    };

    try {
      const fullUrl = `${COUPANG_DOMAIN}${path}?${query}`;
      const response = await axios.get(fullUrl, { headers });

      const data = response.data;

      if (Array.isArray(data.data)) {
        for (const record of data.data) {
          if (record.items && record.items.length > 0) {
            for (const item of record.items) {
              allRecords.push({
                vendor_id: VENDOR_ID,
                order_id: record.orderId,
                sale_type: record.saleType,
                sale_date: record.saleDate,
                recognition_date: record.recognitionDate,
                settlement_date: record.settlementDate,
                product_id: item.productId,
                product_name: item.productName,
                vendor_item_id: item.vendorItemId,
                vendor_item_name: item.vendorItemName,
                quantity: item.quantity,
                sale_price: item.salePrice,
                sale_amount: item.saleAmount,
                settlement_amount: item.settlementAmount,
                service_fee: item.serviceFee,
                service_fee_vat: item.serviceFeeVat,
              });
            }
          }
        }
      }

      token = data.nextToken || "";
      hasMore = !!token;
    } catch (err) {
      console.error("❌ 오류 발생:", err.response?.data || err.message);
      return res.status(500).json({
        status: "fail",
        message: err.response?.data || err.message,
      });
    }
  }

  try {
    const { error } = await supabase.from("sales_raw").insert(allRecords);
    if (error) throw error;
    insertedCount = allRecords.length;

    return res.status(200).json({
      status: "success",
      inserted: insertedCount,
    });
  } catch (err) {
    console.error("❌ Supabase 저장 오류:", err.message);
    return res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
});

// ✅ 쿠팡 오더시트 데이터 받아 Supabase에 저장
app.get("/fetch-orders", async (req, res) => {
  try {
    const createdAtFrom = decodeURIComponent(req.query.createdAtFrom);
    const createdAtTo = decodeURIComponent(req.query.createdAtTo);

    if (!createdAtFrom || !createdAtTo) {
      return res.status(400).json({
        status: "fail",
        message: "createdAtFrom, createdAtTo 쿼리 파라미터가 필요합니다.",
      });
    }

    console.log("🕐 createdAtFrom:", createdAtFrom);
    console.log("🕐 createdAtTo:", createdAtTo);

    const method = "GET";
    const path = "/v2/providers/openapi/apis/api/v1/ordersheets";
    const query = `createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}&searchType=timeCreated&status=INSTRUCT_COMPLETED&status=DELIVERING&status=DELIVERY_COMPLETED&maxPerPage=50`;

    const timestamp = getSignedDate();
    const message = timestamp + method + path + query;

    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(message)
      .digest("hex");

    const authorization = `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`;
    const headers = {
      Authorization: authorization,
      "Content-Type": "application/json",
    };

    const fullUrl = `${COUPANG_DOMAIN}${path}?${query}`;
    console.log("🔗 요청 URL:", fullUrl);

    const response = await axios.get(fullUrl, { headers });

    const records = [];
    for (const order of response.data.data) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          records.push({
            vendor_id: VENDOR_ID,
            order_id: order.orderId,
            order_number: order.orderNumber,
            ordered_at: order.orderedAt,
            paid_at: order.paidAt,
            orderer_name: order.orderer.name,
            receiver_name: order.receiver.name,
            status: order.status,
            product_id: item.productId,
            product_name: item.productName,
            vendor_item_id: item.vendorItemId,
            vendor_item_name: item.vendorItemName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            shipping_price: item.shippingPrice,
            discount_price: item.discountPrice,
            order_item_id: item.orderItemId,
          });
        }
      }
    }

    const { error } = await supabase.from("orders_raw").insert(records);
    if (error) throw error;

    res.status(200).json({ status: "success", inserted: records.length });
  } catch (err) {
    console.error("❌ 서버 에러:", err); // ✅ 여기 추가!
    res.status(500).json({
      status: "fail",
      message: err.response?.data || err.message || "Unknown error",
    });
  }
});



app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
