const fs = require("fs/promises");
const supabase = require("./client");

async function uploadSalesFromFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(raw);

  const rows = [];

  for (const entry of json.data.data) {
    const { recognitionDate, saleType, items = [] } = entry;

    for (const item of items) {
      rows.push({
        recognition_date: recognitionDate,
        sale_type: saleType,
        vendor_item_id: item.vendorItemId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        sale_price: item.salePrice,
        sale_amount: item.saleAmount,
        settlement_amount: item.settlementAmount,
        service_fee: item.serviceFee,
        vendor_id: "A01157089", // 고정값 또는 동적값 지정
      });
    }
  }

  const { error } = await supabase.from("sales_raw").insert(rows);

  if (error) throw error;
  console.log(`✅ ${rows.length}개의 판매 데이터를 업로드했습니다.`);
}

module.exports = { uploadSalesFromFile };
