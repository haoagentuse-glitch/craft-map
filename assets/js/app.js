// ============================================================
//  程式邏輯 —— 一般不需更動
//  依賴：window.CONFIG (config.js)、window.FALLBACK (data.js)
// ============================================================

let DATA = [];
const state = { domain: "陶瓷", cat: "", city: "", q: "" };

// 領域頁籤的偏好排序（沒列到的會排在後面）
const DOMAIN_ORDER = ["陶瓷", "金工", "木工"];

// 複合類別分隔符：一家店可同時屬於多個類別，用全形｜串接（也相容半形 |）。
// 注意：類別名稱本身用「、」（如「原料、土、陶藝工具」），所以不能拿「、」當分隔符。
function splitCats(s) {
  return String(s == null ? "" : s).split(/[｜|]/).map(x => x.trim()).filter(Boolean);
}

// 建議欄：把短句依「問題類型」分成幾組（資料驅動，要加減就改這個物件）。
// 表單每組做一個下拉、可各選一個 → 等於可複選；最後全部合併寫進同一個「建議」欄。
const TIP_GROUPS = {
  "聯絡方式": ["建議先電話預約", "可電話訂購", "歡迎直接前往", "營業時間不固定，先電聯"],
  "付款方式": ["付款：現金/轉帳", "僅收現金", "可刷卡"],
  "訂購方式": ["有最低訂購量", "需先確認庫存", "大宗訂購請先洽詢"],
  "預約／營業": ["採預約制", "假日公休"]
};

// HTML 跳脫：所有要塞進畫面的資料都先經過這裡，避免被當成 HTML/script 執行
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
function isReal(u) { return !!u && !u.includes("在這裡貼上"); }

// 線條式圖示（用 currentColor 繼承主題色，與整體色調一致）
const ICONS = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.79.64-1.47 1.31-2A5 5 0 1 0 8 8.5a5 5 0 0 0 1.6 5.5c.67.53 1.13 1.21 1.31 2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
};


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

// ---------- 欄位對照：表單/試算表的中文標題一併接受 ----------
const KEYMAP = { "領域": "domain", "分類": "category", "名稱": "name", "店名": "name", "縣市": "city", "地區": "city", "地址": "address", "聯絡方式": "contact", "電話": "contact", "營業項目": "items", "項目": "items", "建議": "tips", "小提醒": "tips", "提醒": "tips", "狀態": "status" };
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
  // 隨機排序：每次載入打散順序，避免固定置頂像廣告
  // for (let i = DATA.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [DATA[i], DATA[j]] = [DATA[j], DATA[i]];
  // }
  buildDomains();
  initFilters();
  render();
}

function curset() { return DATA.filter(d => d.domain === state.domain); }

// ---------- 領域頁籤（資料驅動：試算表有哪些領域就長出哪些頁籤） ----------
function buildDomains() {
  const present = [...new Set(DATA.map(d => d.domain).filter(Boolean))];
  present.sort((a, b) => {
    const ia = DOMAIN_ORDER.indexOf(a), ib = DOMAIN_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  // 目前選中的領域若已不存在，改成第一個
  if (!present.includes(state.domain)) state.domain = present[0] || state.domain;

  const upcoming = (window.CONFIG.UPCOMING_DOMAINS || []).filter(d => !present.includes(d));
  const cont = document.getElementById("domains");
  cont.innerHTML =
    present.map(d => `<div class="domain${d === state.domain ? " active" : ""}" data-domain="${esc(d)}">${esc(d)}</div>`).join("") +
    upcoming.map(d => `<div class="domain soon" title="即將開放">${esc(d)}<span class="tag">即將推出</span></div>`).join("");

  cont.querySelectorAll(".domain[data-domain]").forEach(el => el.onclick = () => {
    state.domain = el.dataset.domain;
    state.cat = ""; state.city = "";            // 切換領域時重置子篩選
    cont.querySelectorAll(".domain").forEach(x => x.classList.remove("active"));
    el.classList.add("active");
    initFilters();
    render();
  });
}

// ---------- 初始化篩選器 ----------
function initFilters() {
  const set = curset();
  // 類別資料驅動：把每筆的複合類別拆開後取唯一值；一家跨多類就會在多個類別都計數
  const cats = [...new Set(set.flatMap(d => splitCats(d.category)))];
  const cont = document.getElementById("cats");
  cont.innerHTML = '<div class="chip on" data-cat="">全部分類</div>' +
    cats.map(c => `<div class="chip" data-cat="${esc(c)}">${esc(c)} <span style="opacity:.6">${set.filter(d => splitCats(d.category).includes(c)).length}</span></div>`).join("");
  cont.querySelectorAll(".chip").forEach(ch => ch.onclick = () => {
    state.cat = ch.dataset.cat;
    cont.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
    ch.classList.add("on");
    render();
  });

  const cities = [...new Set(set.map(d => d.city))].sort();
  const sel = document.getElementById("city");
  sel.innerHTML = '<option value="">全部地區</option>' + cities.map(c => `<option>${esc(c)}</option>`).join("");
  sel.value = state.city;
  sel.onchange = () => { state.city = sel.value; render(); };
}

// ---------- 卡片內容 ----------
function mapsLink(addr) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr);
}

// 是否顯示「回報有誤」
function reportEnabled() { return isReal(window.CONFIG.SUBMIT_URL) || isReal(window.CONFIG.REPORT_FORM_URL); }
function reportBtn(name) {
  if (!reportEnabled()) return "";
  return `<button class="report" data-name="${esc(name)}" title="協助更新這筆資料：回報有誤、搬家，或補充建議"><span class="ic ic-sm">${ICONS.edit}</span> 協助維護</button>`;
}

function contactCell(d) {
  if (!d.contact) return "";
  if (d.contactType === "ig" || /IG|@/.test(d.contact)) {
    const h = (d.contact.match(/@([\w._]+)/) || [])[1];
    const url = h ? ("https://instagram.com/" + h) : null;
    return `<div class="row"><span class="ic">${ICONS.ig}</span>${url ? `<a href="${esc(url)}" target="_blank">${esc(d.contact)}</a>` : esc(d.contact)}</div>`;
  }
  let tel = d.contact.replace(/[^0-9+]/g, "");
  // 台灣號碼補回被試算表吃掉的開頭 0，讓「點擊撥號」能正確撥出
  if (tel && tel[0] !== "0" && tel[0] !== "+") tel = "0" + tel;
  return `<div class="row"><span class="ic">${ICONS.phone}</span><a href="tel:${esc(tel)}">${esc(d.contact)}</a></div>`;
}

// ---------- 渲染 ----------
function render() {
  const q = state.q.trim().toLowerCase();
  let list = curset();
  if (state.cat) list = list.filter(d => splitCats(d.category).includes(state.cat));
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
    const foot = reportBtn(d.name);
    return `
    <div class="card">
      <div class="top"><h3>${esc(d.name)}</h3><div class="badges">${splitCats(d.category).map(c => `<span class="badge">${esc(c)}</span>`).join("")}</div></div>
      ${d.items ? `<div class="items">${esc(d.items)}</div>` : ""}
      <div class="meta">
        ${d.address ? `<div class="row"><span class="ic">${ICONS.pin}</span><a href="${esc(mapsLink(d.address))}" target="_blank">${esc(d.address)}</a></div>` : ""}
        ${contactCell(d)}
      </div>
      ${foot ? `<div class="cardfoot">${foot}</div>` : ""}
      ${d.tips ? `<div class="tips"><span class="ic ic-sm">${ICONS.tip}</span><span>${esc(d.tips)}</span></div>` : ""}
    </div>`;
  }).join("");
}

// ============================================================
//  站內新增／回報彈窗
// ============================================================
function openModal(html) {
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").style.display = "flex";
}
function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("modalBody").innerHTML = "";
}

function addFormHtml() {
  // 類別資料驅動：列出目前領域已有的類別（拆開複合類別後的唯一值）
  const cats = [...new Set(curset().flatMap(d => splitCats(d.category)))];
  return `
    <h3>新增一家資源</h3>
    <p class="modal-note">標示 * 的欄位必填。送出後會先進入待審核，由管理者確認後才公開顯示。</p>
    <form id="subform">
      <input type="hidden" name="type" value="add">
      <input type="hidden" name="分類">
      <input type="hidden" name="建議">
      <label>領域（依目前檢視的領域）<input name="領域" value="${esc(state.domain)}" readonly></label>
      <fieldset class="catbox">
        <legend>分類 *（可複選，跨類就勾多個）</legend>
        ${cats.map(c => `<label class="ck"><input type="checkbox" class="catpick" value="${esc(c)}"> ${esc(c)}</label>`).join("")}
        <label class="ck full">其他（新類別，多個用｜隔開）<input type="text" id="catOther" maxlength="40" placeholder="找不到合適類別時自行填寫"></label>
      </fieldset>
      <label>名稱 *<input name="名稱" required maxlength="60"></label>
      <label>地址 *<input name="地址" required maxlength="120"></label>
      <label>聯絡方式 *<input name="聯絡方式" required placeholder="電話或 IG 帳號" maxlength="80"></label>
      <label>營業項目 *<input name="營業項目" required maxlength="120"></label>
      <fieldset class="tipbox">
        <legend>建議（選填，給訪客的小提醒；每組可各選一個）</legend>
        ${Object.keys(TIP_GROUPS).map(g => `<label class="tipsel"><span>${esc(g)}</span><select class="tippick"><option value="">— 不選 —</option>${TIP_GROUPS[g].map(t => `<option>${esc(t)}</option>`).join("")}</select></label>`).join("")}
        <label class="tipsel full"><span>其他</span><input type="text" id="tipOther" maxlength="25" placeholder="特殊規則自行補充，最多 25 字"></label>
      </fieldset>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
      <div class="modal-actions">
        <button type="button" data-close>取消</button>
        <button type="submit" class="primary">送出</button>
      </div>
    </form>`;
}

function reportFormHtml(name) {
  return `
    <h3>協助維護這筆資料</h3>
    <p class="modal-note">看到資訊有誤、店家搬遷，或想補充建議都歡迎。以下全部選填，至少填一項即可；送出後由管理者確認。</p>
    <form id="subform">
      <input type="hidden" name="type" value="report">
      <input type="hidden" name="建議">
      <label>店名<input name="店名" value="${esc(name)}" readonly></label>
      <label>資料有問題嗎？（選填）<select name="問題類型">
        <option value="">— 沒問題／不選 —</option>
        <option>已歇業</option><option>已搬遷</option>
        <option>電話或地址有誤</option><option>其他</option>
      </select></label>
      <fieldset class="tipbox">
        <legend>補充建議（選填，給訪客的小提醒）</legend>
        ${Object.keys(TIP_GROUPS).map(g => `<label class="tipsel"><span>${esc(g)}</span><select class="tippick"><option value="">— 不選 —</option>${TIP_GROUPS[g].map(t => `<option>${esc(t)}</option>`).join("")}</select></label>`).join("")}
        <label class="tipsel full"><span>其他</span><input type="text" id="tipOther" maxlength="25" placeholder="特殊規則自行補充，最多 25 字"></label>
      </fieldset>
      <label>說明／補充（選填）<textarea name="說明" rows="3" maxlength="300" placeholder="例如：正確電話、新地址，或其他想補充的資訊"></textarea></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
      <div class="modal-actions">
        <button type="button" data-close>取消</button>
        <button type="submit" class="primary">送出</button>
      </div>
    </form>`;
}

function onAdd() {
  if (isReal(window.CONFIG.SUBMIT_URL)) openModal(addFormHtml());
  else if (isReal(window.CONFIG.FORM_URL)) window.open(window.CONFIG.FORM_URL, "_blank");
  else alert("管理者尚未設定新增功能。");
}
function onReport(name) {
  if (isReal(window.CONFIG.SUBMIT_URL)) openModal(reportFormHtml(name));
  else if (isReal(window.CONFIG.REPORT_FORM_URL)) window.open(window.CONFIG.REPORT_FORM_URL, "_blank");
}

async function handleSubmit(form) {
  if (form.website && form.website.value) { closeModal(); return; } // honeypot：機器人填了就默默忽略

  // 新增表單：把複選分類＋其他自填合併成單一「分類」字串（用｜串）
  if (form.type && form.type.value === "add") {
    const picks = [...form.querySelectorAll(".catpick:checked")].map(c => c.value);
    const other = (form.querySelector("#catOther")?.value || "").trim();
    if (other) splitCats(other).forEach(s => picks.push(s));
    const catVal = [...new Set(picks)].join("｜");
    if (!catVal) { alert("請至少勾選一個分類，或在『其他』填寫一個。"); return; }
    form.querySelector("[name=分類]").value = catVal;
  }

  // 建議：新增與回報表單都有分組下拉，合併成單一字串存進「建議」
  if (form.querySelector("[name=建議]")) {
    const tips = [...form.querySelectorAll(".tippick")].map(s => s.value.trim()).filter(Boolean);
    const tipOther = (form.querySelector("#tipOther")?.value || "").trim();
    if (tipOther) tips.push(tipOther);
    form.querySelector("[name=建議]").value = tips.join("、");
  }

  // 維護表單：全部選填，但至少要填一項（問題、建議或說明）才送出
  if (form.type && form.type.value === "report") {
    const issue = (form.querySelector("[name=問題類型]")?.value || "").trim();
    const note = (form.querySelector("[name=說明]")?.value || "").trim();
    const tip = (form.querySelector("[name=建議]")?.value || "").trim();
    if (!issue && !note && !tip) { alert("請至少填一項（問題類型、建議，或說明）再送出。"); return; }
  }

  const fd = new FormData(form);
  const params = new URLSearchParams();
  for (const [k, v] of fd) params.append(k, v);
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "送出中…";
  try {
    await fetch(window.CONFIG.SUBMIT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString()
    });
    document.getElementById("modalBody").innerHTML =
      '<div class="modal-done"><h3>已送出 🙌</h3><p>感謝你的貢獻！通過審核後就會顯示。</p><button class="primary" data-close>關閉</button></div>';
  } catch (err) {
    btn.disabled = false; btn.textContent = "送出";
    alert("送出失敗，請稍後再試一次。");
  }
}

// ---------- 事件綁定 ----------
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value; render(); });
document.getElementById("fab").onclick = onAdd;

document.getElementById("grid").addEventListener("click", e => {
  const b = e.target.closest(".report");
  if (b) onReport(b.dataset.name || "");
});

const modalEl = document.getElementById("modal");
modalEl.addEventListener("click", e => {
  if (e.target === modalEl || e.target.id === "modalClose" || e.target.hasAttribute("data-close")) closeModal();
});
modalEl.addEventListener("submit", e => {
  if (e.target.id === "subform") { e.preventDefault(); handleSubmit(e.target); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

loadData();
