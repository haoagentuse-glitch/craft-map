// ============================================================
//  設定檔 —— 平常只需要改這個檔案
// ============================================================
window.CONFIG = {
  // 1) 把 Google 試算表「檔案 → 共用 → 發布到網路」取得的 CSV 連結貼在這裡。
  //    留空字串時，網頁會改用內建資料（assets/js/data.js）。
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSM6uq3sP5DuHXxa6i9wWVfMkmS6gdQYTY9OoheQttaiwoir78CPnHUgGSKKIk8Sng8ceHltJiU_X4Z/pub?gid=1140260398&single=true&output=csv",

  // 2) 站內新增／回報的後端（Google Apps Script 網頁應用程式網址）。
  //    填了之後，「新增」與「回報有誤」都會在網站內彈窗填寫送出，不跳轉。
  //    設定方式見「站內新增_設定指南.md」。
  SUBMIT_URL: "https://script.google.com/macros/s/AKfycbwmx-Br5i4lidGkEsN_ZoGm1kR-q95xCQ_nr0WA1_ea6Ll2z2HEJN0lVe8WU3bTDESMqQ/exec",

  // 3)（備援）若沒設定 SUBMIT_URL，「新增」按鈕會改為打開這個 Google 表單連結。
  FORM_URL: "",

  // 4)（備援）若沒設定 SUBMIT_URL，卡片「回報有誤」會改為打開這個 Google 表單連結。
  REPORT_FORM_URL: ""
};
