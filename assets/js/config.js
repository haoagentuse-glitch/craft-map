// ============================================================
//  設定檔 —— 平常只需要改這個檔案
// ============================================================
window.CONFIG = {
  // 1) 把 Google 試算表「檔案 → 共用 → 發布到網路」取得的 CSV 連結貼在這裡。
  //    留空字串時，網頁會改用內建資料（assets/js/data.js）。
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSM6uq3sP5DuHXxa6i9wWVfMkmS6gdQYTY9OoheQttaiwoir78CPnHUgGSKKIk8Sng8ceHltJiU_X4Z/pub?gid=1140260398&single=true&output=csv",

  // 2) 換成你的 Google 表單投稿連結（新增一家店）。
  FORM_URL: "https://forms.gle/在這裡貼上你的新增表單連結",

  // 3) 回報有誤表單連結（例如某店倒了、搬家、資訊錯誤）。留空則不顯示「回報有誤」。
  REPORT_FORM_URL: "https://forms.gle/在這裡貼上你的回報表單連結",

  // 4)（選填）回報表單中「店名」那一題的 entry id，填了就能自動帶入被回報的店名。
  //    取得方式：回報表單 → 預覽 → 在店名欄輸入任意字 → 右上「⋮ → 取得預先填入的連結」，
  //    產生的網址裡 entry.數字=你輸入的字，把那串數字（含 entry.）貼進來，例如 "entry.123456789"。
  REPORT_NAME_ENTRY: ""
};
