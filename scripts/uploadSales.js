const path = require("path");
const { uploadSalesFromFile } = require("../supabase/uploadSales");

(async () => {
  const filePath = path.join(__dirname, "../data/sales_row.json");

  try {
    await uploadSalesFromFile(filePath);
    console.log("🎉 업로드 완료!");
  } catch (err) {
    console.error("❌ 업로드 실패:", err.message);
  }
})();
