const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("querystring");
// 기존 import 및 세팅 생략 (express, axios, crypto, querystring 등)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  const query = `vendorId=${VENDOR_ID}&recognitionDateFrom=${recognitionDateFrom}&recognitionDateTo=${recognitionDateTo}&token=&maxPerPage=50`;

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

    const records = [];

    for (const record of response.data.data) {
      if (record.items && record.items.length > 0) {
        for (const item of record.items) {
          records.push({
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

    const { error } = await supabase.from("sales_raw").insert(records);
    if (error) throw error;

    res.status(200).json({ status: "success", inserted: records.length });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.response?.data || err.message,
    });
  }
});
