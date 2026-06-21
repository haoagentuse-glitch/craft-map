// ============================================================
//  設定檔 —— 平常只需要改這個檔案
// ============================================================
window.CONFIG = {
  // 1) Google 試算表「發布到網路」取得的 CSV 連結。留空則改用內建資料。
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSM6uq3sP5DuHXxa6i9wWVfMkmS6gdQYTY9OoheQttaiwoir78CPnHUgGSKKIk8Sng8ceHltJiU_X4Z/pub?gid=1140260398&single=true&output=csv",

  // 2) 站內新增／回報後端（Apps Script 網頁應用程式 /exec 網址）。
  SUBMIT_URL: "https://script.google.com/macros/s/AKfycbwmx-Br5i4lidGkEsN_ZoGm1kR-q95xCQ_nr0WA1_ea6Ll2z2HEJN0lVe8WU3bTDESMqQ/exec",

  // 3) 尚未有資料、但想先顯示為「即將推出」的領域頁籤。
  //    一旦該領域在試算表有了 approved 資料，會自動變成可點選（不必改這裡）。
  UPCOMING_DOMAINS: ["金工", "木工"],

  // 4)（備援）沒設定 SUBMIT_URL 時，「新增」改開這個 Google 表單連結。
  FORM_URL: "",

  // 5)（備援）沒設定 SUBMIT_URL 時，「回報有誤」改開這個 Google 表單連結。
  REPORT_FORM_URL: ""
};
