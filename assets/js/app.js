// ============================================================
//  程式邏輯 —— 一般不需更動
//  依賴：window.CONFIG (config.js)、window.FALLBACK (data.js)
// ============================================================

let DATA = [];
const state = { domain: "陶瓷", cat: "", city: "", q: "" };

// HTML 跳脫：所有要塞進畫面的資料都先經過這裡，避免被當成 HTML/script 執行
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

// ---------- CSV 解析 ----------
function parseCSV(text) {
  const rows = [];
  let i = 0, f = "", row = [], q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c === "\r") { /* skip */ }
      else f += c;
    }
    i++;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(x => x && x.trim())).map(r => {
    const o = {};
    head.forEach((h, j) => o[h] = (r[j] || "").trim());
    return o;
  });
}

// ---------- 縣市判斷（新增資料若沒填縣市，從地址自動推算） ----------
const COUNTY_CITY = { "宜蘭市": "宜蘭縣", "彰化市": "彰化縣", "苗栗市": "苗栗縣", "南投市": "南投縣", "屏東市": "屏東縣", "花蓮市": "花蓮縣", "員林市": "彰化縣" };
const CITIES = ["臺北市", "台北市", "新北市", "桃園市", "台中市", "臺中市", "台南市", "臺南市", "高雄市", "基隆市", "新竹市", "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "台東縣", "澎湖縣", "金門縣", "連江縣"];
function cityOf(addr) {
  if (!addr) return "其他";
  const a = addr.trim();
  for (const k in COUNTY_CITY) if (a.startsWith(k)) return COUNTY_CITY[k];
  for (const c of CITIES) if (a.startsWith(c)) return c.replace("台", "臺");
  return "其他";
}

// ---------- 欄位對照：Google 表單自動產生中文標題，這裡一併接受 ----------
const KEYMAP = { "領域": "domain", "分類": "category", "名稱": "name", "店名": "name", "縣市": "city", "地區": "city", "地址": "address", "聯絡方式": "contact", "電話": "contact", "營業項目": "items", "項目": "items", "狀態": "status" };
function normalize(raw) {
  return raw.map(r => {
    const o = {};
    for (const k in r) { const key = KEYMAP[k.trim()] || k.trim(); o[key] = r[k]; }
    if (!o.domain) o.domain = "陶瓷";
    if (!o.city || o.city === "") o.city = cityOf(o.address);
    if (!o.contactType) o.contactType = (o.contact && /IG|@/.test(o.contact)) ? "ig" : (o.contact ? "phone" : "none");
    return o;
  });
}

// ---------- 載入資料 ----------
async function loadData() {
  const note = document.getElementById("srcnote");
  if (window.CONFIG.SHEET_CSV_URL) {
    try {
      const t = await (await fetch(window.CONFIG.SHEET_CSV_URL)).text();
      DATA = normalize(parseCSV(t));
      note.textContent = "資料來源：線上試算表（社群共筆）";
    } catch (e) {
      DATA = window.FALLBACK;
      note.textContent = "（無法連線試算表，暫用內建資料）";
    }
  } else {
    DATA = window.FALLBACK;
    note.textContent = "目前為內建示範資料；接上 Google 試算表後即為社群即時資料。";
  }
  DATA = DATA.filter(d => (d.status || "").trim() === "approved");
  initFilters();
  render();
}

function curset() { return DATA.filter(d => d.domain === state.domain); }

// ---------- 初始化篩選器 ----------
function initFilters() {
  const set = curset();
  const cats = [...new Set(set.map(d => d.category))];
  const cont = document.getElementById("cats");
  cont.innerHTML = '<div class="chip on" data-cat="">全部分類</div>' +
    cats.map(c => `<div class="chip" data-cat="${esc(c)}">${esc(c)} <span style="opacity:.6">${set.filter(d => d.category === c).length}</span></div>`).join("");
  cont.querySelectorAll(".chip").forEach(ch => ch.onclick = () => {
    state.cat = ch.dataset.cat;
    cont.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
    ch.classList.add("on");
    render();
  });

  const cities = [...new Set(set.map(d => d.city))].sort();
  const sel = document.getElementById("city");
  sel.innerHTML = '<option value="">全部地區</option>' + cities.map(c => `<option>${esc(c)}</option>`).join("");
  sel.onchange = () => { state.city = sel.value; render(); };
}

// ---------- 卡片內容 ----------
function mapsLink(addr) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr);
}

// 回報有誤連結：可選擇帶入店名
function reportLink(name) {
  const base = window.CONFIG.REPORT_FORM_URL;
  if (!base) return "";
  let url = base;
  const entry = window.CONFIG.REPORT_NAME_ENTRY;
  if (entry) {
    url += (base.includes("?") ? "&" : "?") + "usp=pp_url&" + entry + "=" + encodeURIComponent(name);
  }
  return `<a class="report" href="${esc(url)}" target="_blank" title="回報這筆資料有誤（例如倒閉、搬家）">⚠ 回報有誤</a>`;
}

function contactCell(d) {
  if (!d.contact) return "";
  if (d.contactType === "ig" || /IG|@/.test(d.contact)) {
    const h = (d.contact.match(/@([\w._]+)/) || [])[1];
    const url = h ? ("https://instagram.com/" + h) : null;
    return `<div class="row"><span class="ic">📷</span>${url ? `<a href="${esc(url)}" target="_blank">${esc(d.contact)}</a>` : esc(d.contact)}</div>`;
  }
  const tel = d.contact.replace(/[^0-9+]/g, "");
  return `<div class="row"><span class="ic">📞</span><a href="tel:${esc(tel)}">${esc(d.contact)}</a></div>`;
}

// ---------- 渲染 ----------
function render() {
  const q = state.q.trim().toLowerCase();
  let list = curset();
  if (state.cat) list = list.filter(d => d.category === state.cat);
  if (state.city) list = list.filter(d => d.city === state.city);
  if (q) list = list.filter(d => (d.name + d.items + d.address + d.category).toLowerCase().includes(q));

  document.getElementById("count").textContent =
    `共 ${list.length} 筆${state.cat ? " · " + state.cat : ""}${state.city ? " · " + state.city : ""}`;

  const g = document.getElementById("grid");
  if (!list.length) {
    g.innerHTML = '<div class="empty">找不到符合的資源 — 也許你可以按右下角新增第一家！</div>';
    return;
  }
  g.innerHTML = list.map(d => {
    const foot = reportLink(d.name);
    return `
    <div class="card">
      <div class="top"><h3>${esc(d.name)}</h3><span class="badge">${esc(d.category)}</span></div>
      ${d.items ? `<div class="items">${esc(d.items)}</div>` : ""}
      <div class="meta">
        ${d.address ? `<div class="row"><span class="ic">📍</span><a href="${esc(mapsLink(d.address))}" target="_blank">${esc(d.address)}</a></div>` : ""}
        ${contactCell(d)}
      </div>
      ${foot ? `<div class="cardfoot">${foot}</div>` : ""}
    </div>`;
  }).join("");
}

// ---------- 事件綁定 ----------
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value; render(); });
document.getElementById("fab").onclick = () => window.open(window.CONFIG.FORM_URL, "_blank");

loadData();
