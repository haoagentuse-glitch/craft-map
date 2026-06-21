// ============================================================
//  程式邏輯 —— 一般不需更動
//  依賴：window.CONFIG (config.js)、window.FALLBACK (data.js)
// ============================================================

let DATA = [];
const state = { domain: "陶瓷", cat: "", city: "", q: "" };

// 領域頁籤的偏好排序（沒列到的會排在後面）
const DOMAIN_ORDER = ["陶瓷", "金工", "木工"];

// HTML 跳脫：所有要塞進畫面的資料都先經過這裡，避免被當成 HTML/script 執行
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
function isReal(u) { return !!u && !u.includes("在這裡貼上"); }

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
  return `<button class="report" data-name="${esc(name)}" title="回報這筆資料有誤（例如倒閉、搬家）">⚠ 回報有誤</button>`;
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
    const foot = reportBtn(d.name);
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
  const cats = [...new Set(curset().map(d => d.category))];
  return `
    <h3>新增一家資源</h3>
    <p class="modal-note">所有欄位皆必填。送出後會先進入待審核，由管理者確認後才公開顯示。</p>
    <form id="subform">
      <input type="hidden" name="type" value="add">
      <label>領域（依目前檢視的領域）<input name="領域" value="${esc(state.domain)}" readonly></label>
      <label>分類 *<select name="分類" required>${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select></label>
      <label>名稱 *<input name="名稱" required maxlength="60"></label>
      <label>地址 *<input name="地址" required maxlength="120"></label>
      <label>聯絡方式 *<input name="聯絡方式" required placeholder="電話或 IG 帳號" maxlength="80"></label>
      <label>營業項目 *<input name="營業項目" required maxlength="120"></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
      <div class="modal-actions">
        <button type="button" data-close>取消</button>
        <button type="submit" class="primary">送出</button>
      </div>
    </form>`;
}

function reportFormHtml(name) {
  return `
    <h3>回報資料有誤</h3>
    <p class="modal-note">回報後由管理者確認，不會立即改動資料。</p>
    <form id="subform">
      <input type="hidden" name="type" value="report">
      <label>店名<input name="店名" value="${esc(name)}" readonly></label>
      <label>問題類型 *<select name="問題類型" required>
        <option>已歇業</option><option>已搬遷</option>
        <option>電話或地址有誤</option><option>其他</option>
      </select></label>
      <label>正確資訊或說明 *<textarea name="說明" rows="3" required maxlength="300"></textarea></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
      <div class="modal-actions">
        <button type="button" data-close>取消</button>
        <button type="submit" class="primary">送出回報</button>
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
