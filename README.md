# 工藝資源地圖

社群共筆的工藝資源通訊錄。陶瓷先上線，未來可擴充金工、木工等領域。
任何人都能投稿新增、但不能刪改既有資料；維護者只需把投稿狀態設為 `approved` 即可上線。

## 目錄結構

```
craft-map/
├── index.html              ← 網頁主檔（HTML 結構）
├── assets/
│   ├── css/
│   │   └── style.css       ← 樣式
│   └── js/
│       ├── config.js       ← 設定（平常只改這裡：試算表連結、表單連結）
│       ├── data.js         ← 內建備援資料（137 筆，自動轉出，平時免動）
│       └── app.js          ← 程式邏輯（篩選、搜尋、渲染，一般免動）
└── README.md               ← 本說明
```

## 快速開始

直接用瀏覽器打開 `index.html` 即可看到內建資料版本。

## 接上線上資料庫（Google 試算表）

打開 `assets/js/config.js`，填入兩個連結：

```js
window.CONFIG = {
  SHEET_CSV_URL: "https://docs.google.com/.../pub?output=csv", // 試算表發布的 CSV
  FORM_URL: "https://forms.gle/你的表單代碼"                    // 投稿表單
};
```

`SHEET_CSV_URL` 有值時即改讀線上試算表；留空則使用內建 `data.js`。
詳細的試算表＋表單建立步驟，見上層資料夾的「串接Google試算表_設定指南.md」。

## 部署

純前端靜態網站，可直接放上 GitHub Pages / Netlify / Cloudflare Pages。
GitHub Pages：把整個 `craft-map` 內容（含 `index.html` 與 `assets/`）推到 repo，
Settings → Pages → 由 main 分支 / root 發布即可。

## 設計原則

- **只增不刪改**：投稿走 Google 表單，天生只能新增、看不到也改不了別人的資料。
- **先審後上**：投稿狀態為空白時不顯示，維護者填入 `approved` 才公開。
- **可擴充領域**：領域是資料欄位而非寫死分頁；新增金工/木工只要在資料加值、
  並在 `index.html` 把對應頁籤的 `soon` 拿掉即可。
