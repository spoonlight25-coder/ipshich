/* =========================================================
   ИПшич — PDF-инструменты. Всё работает в браузере (pdf-lib + JSZip),
   файлы никуда не отправляются.
   ========================================================= */
const TOOLS = [
  { id: "merge",   ic: "🧩", bg: "#efedff", title: "Объединить PDF",     desc: "Несколько файлов → один, в нужном порядке", accept: "application/pdf,.pdf", multi: true,  btn: "Объединить" },
  { id: "img",     ic: "🖼️", bg: "#e6f8f5", title: "Фото в PDF",          desc: "Сканы и фото с телефона → один PDF",        accept: "image/*",              multi: true,  btn: "Сделать PDF" },
  { id: "extract", ic: "✂️", bg: "#fff1e6", title: "Извлечь страницы",    desc: "Оставить в файле только нужные страницы",   accept: "application/pdf,.pdf", multi: false, btn: "Извлечь" },
  { id: "split",   ic: "📑", bg: "#ffe9f3", title: "Разделить PDF",       desc: "Каждая страница — отдельный файл (ZIP)",     accept: "application/pdf,.pdf", multi: false, btn: "Разделить" },
  { id: "rotate",  ic: "🔄", bg: "#e8f1ff", title: "Повернуть страницы",  desc: "Если скан лёг боком или вверх ногами",       accept: "application/pdf,.pdf", multi: false, btn: "Повернуть" },
  { id: "number",  ic: "🔢", bg: "#fff7e6", title: "Пронумеровать",       desc: "Номера страниц внизу листа",                accept: "application/pdf,.pdf", multi: false, btn: "Пронумеровать" }
];

const toolsBox = document.getElementById("tools"), workBox = document.getElementById("work");
let cur = null, files = [];

TOOLS.forEach(t => {
  const b = document.createElement("button");
  b.className = "tool"; b.dataset.id = t.id;
  b.innerHTML = `<div class="ti" style="background:${t.bg}">${t.ic}</div><div><b>${t.title}</b><span>${t.desc}</span></div>`;
  b.onclick = () => openTool(t.id);
  toolsBox.appendChild(b);
});

function optsHtml(id) {
  const seg = (name, items) => `<div class="seg" data-name="${name}">${items.map((x, i) => `<button type="button" class="${i ? "" : "on"}" data-v="${x[0]}">${x[1]}</button>`).join("")}</div>`;
  if (id === "img") return `<div class="opts">
      <div><label class="t">Размер страницы</label>${seg("size", [["a4", "A4"], ["fit", "По размеру фото"]])}</div>
      <div><label class="t">Поля</label>${seg("margin", [["28", "Обычные"], ["12", "Узкие"], ["0", "Без полей"]])}</div></div>`;
  if (id === "extract") return `<div class="opts"><div><label class="t">Какие страницы оставить</label><input type="text" data-name="pages" placeholder="например: 1-3, 5, 8"></div></div>`;
  if (id === "rotate") return `<div class="opts">
      <div><label class="t">Повернуть</label>${seg("angle", [["90", "↻ 90° вправо"], ["270", "↺ 90° влево"], ["180", "180°"]])}</div>
      <div><label class="t">Страницы <span style="font-weight:500;color:var(--muted)">(пусто — все)</span></label><input type="text" data-name="pages" placeholder="например: 2, 4-6"></div></div>`;
  if (id === "number") return `<div class="opts">
      <div><label class="t">Где</label>${seg("pos", [["c", "Внизу по центру"], ["r", "Внизу справа"]])}</div>
      <div><label class="t">Вид</label>${seg("fmt", [["n", "1"], ["nn", "1 / 10"], ["d", "– 1 –"]])}</div>
      <div><label class="t">Начать со страницы</label><input type="text" data-name="from" value="1" style="width:110px"></div></div>`;
  return "";
}

function openTool(id) {
  cur = TOOLS.find(t => t.id === id); files = [];
  toolsBox.querySelectorAll(".tool").forEach(b => b.classList.toggle("on", b.dataset.id === id));
  workBox.innerHTML = `<div class="work">
    <h3>${cur.ic} ${cur.title}</h3><p class="sub2">${cur.desc}</p>
    <label class="drop" id="drop">
      <div class="big">${cur.id === "img" ? "📷" : "📄"}</div>
      <b>${cur.multi ? "Выбери файлы" : "Выбери файл"} или перетащи сюда</b>
      <span>${cur.id === "img" ? "JPG, PNG, WEBP" : "PDF"}${cur.multi ? " · можно несколько" : ""}</span>
      <input type="file" id="fin" accept="${cur.accept}" ${cur.multi ? "multiple" : ""} hidden>
    </label>
    <ul class="files" id="flist"></ul>
    ${optsHtml(id)}
    <div class="run"><button class="btn main" id="go" disabled>${cur.btn} <span class="arr">→</span></button><span class="status" id="st"></span></div>
    <div class="privacy">🔒 Файлы не покидают твоё устройство</div>
  </div>`;
  workBox.querySelectorAll(".seg").forEach(s => s.querySelectorAll("button").forEach(b => b.onclick = () => {
    s.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  }));
  const drop = document.getElementById("drop"), fin = document.getElementById("fin");
  fin.onchange = () => addFiles(fin.files);
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
  document.getElementById("go").onclick = run;
  workBox.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addFiles(list) {
  const arr = [...list].filter(f => cur.id === "img" ? f.type.startsWith("image/") : (f.type === "application/pdf" || /\.pdf$/i.test(f.name)));
  if (!arr.length) { status(cur.id === "img" ? "Нужны картинки (JPG, PNG)" : "Нужен PDF-файл", "err"); return; }
  files = cur.multi ? files.concat(arr) : [arr[0]];
  renderList(); status("");
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " МБ" : Math.max(1, Math.round(n / 1024)) + " КБ";
function renderList() {
  const ul = document.getElementById("flist");
  ul.innerHTML = files.map((f, i) => `<li><span>${cur.id === "img" ? "🖼️" : "📄"}</span><span class="nm">${f.name.replace(/</g, "&lt;")}</span><span class="sz">${kb(f.size)}</span>
    ${cur.multi ? `<button title="Выше" data-a="up" data-i="${i}">↑</button><button title="Ниже" data-a="down" data-i="${i}">↓</button>` : ""}
    <button title="Убрать" data-a="del" data-i="${i}">✕</button></li>`).join("");
  ul.querySelectorAll("button").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (b.dataset.a === "del") files.splice(i, 1);
    if (b.dataset.a === "up" && i > 0) [files[i - 1], files[i]] = [files[i], files[i - 1]];
    if (b.dataset.a === "down" && i < files.length - 1) [files[i + 1], files[i]] = [files[i], files[i + 1]];
    renderList();
  });
  const need = cur.id === "merge" ? 2 : 1;
  document.getElementById("go").disabled = files.length < need;
  if (cur.id === "merge" && files.length === 1) status("Добавь ещё хотя бы один файл");
}
function status(t, cls) { const s = document.getElementById("st"); if (s) { s.textContent = t; s.className = "status " + (cls || ""); } }
const opt = name => { const el = workBox.querySelector(`[data-name="${name}"]`); if (!el) return ""; return el.classList.contains("seg") ? el.querySelector("button.on").dataset.v : el.value.trim(); };

/* "1-3, 5, 8-" → индексы страниц (с нуля) */
function parsePages(str, total) {
  if (!str) return [...Array(total).keys()];
  const out = [];
  for (const part of str.split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)?\s*[-–]\s*(\d+)?$/);
    let a, b;
    if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total; }
    else if (/^\d+$/.test(part)) { a = b = +part; }
    else throw new Error(`Не понял «${part}». Пиши так: 1-3, 5, 8`);
    if (a < 1 || b > total || a > b) throw new Error(`Страницы ${part} нет: в файле ${total} стр.`);
    for (let p = a; p <= b; p++) if (!out.includes(p - 1)) out.push(p - 1);
  }
  return out;
}
const base = () => (files[0] ? files[0].name.replace(/\.[^.]+$/, "") : "файл");
function download(bytes, name, type = "application/pdf") {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function loadPdf(f) {
  try { return await PDFLib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true }); }
  catch (e) { throw new Error(`Не открывается «${f.name}» — файл повреждён или защищён паролем`); }
}
async function imageToJpeg(f) {
  // <img> сам учитывает поворот фото с телефона (EXIF)
  const src = URL.createObjectURL(f);
  const bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`Не открывается картинка «${f.name}»`)); im.src = src; });
  URL.revokeObjectURL(src);
  const w = bmp.naturalWidth, h = bmp.naturalHeight, k = Math.min(1, 3000 / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  // toDataURL синхронный — надёжнее toBlob (тот иногда не отвечает)
  const b64 = c.toDataURL("image/jpeg", 0.9).split(",")[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, w: c.width, h: c.height };
}

async function run() {
  const go = document.getElementById("go");
  if (typeof PDFLib === "undefined") { status("Библиотека PDF ещё грузится — попробуй через пару секунд", "err"); return; }
  go.disabled = true; status("Работаю…");
  try {
    const { PDFDocument, degrees, StandardFonts, rgb } = PDFLib;
    if (cur.id === "merge") {
      const out = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        status(`Файл ${i + 1} из ${files.length}…`);
        const src = await loadPdf(files[i]);
        (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p));
      }
      download(await out.save(), `${base()}_объединённый.pdf`);
      status(`Готово: ${out.getPageCount()} стр. — файл скачан ✅`, "ok");
    }
    if (cur.id === "img") {
      const out = await PDFDocument.create(), m = +opt("margin"), fit = opt("size") === "fit";
      for (let i = 0; i < files.length; i++) {
        status(`Фото ${i + 1} из ${files.length}…`);
        const im = await imageToJpeg(files[i]), jpg = await out.embedJpg(im.bytes);
        let pw, ph;
        if (fit) { pw = im.w * 0.75 + 2 * m; ph = im.h * 0.75 + 2 * m; }
        else { const land = im.w > im.h; pw = land ? 841.89 : 595.28; ph = land ? 595.28 : 841.89; }
        const page = out.addPage([pw, ph]);
        const s = Math.min((pw - 2 * m) / im.w, (ph - 2 * m) / im.h);
        const w = im.w * s, h = im.h * s;
        page.drawImage(jpg, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
      download(await out.save(), `${base()}.pdf`);
      status(`Готово: ${files.length} стр. — файл скачан ✅`, "ok");
    }
    if (cur.id === "extract") {
      const src = await loadPdf(files[0]), idx = parsePages(opt("pages"), src.getPageCount());
      if (!opt("pages")) throw new Error("Укажи, какие страницы оставить");
      const out = await PDFDocument.create();
      (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
      download(await out.save(), `${base()}_стр.pdf`);
      status(`Готово: ${idx.length} стр. из ${src.getPageCount()} — файл скачан ✅`, "ok");
    }
    if (cur.id === "split") {
      const src = await loadPdf(files[0]), n = src.getPageCount();
      if (n < 2) throw new Error("В файле одна страница — делить нечего");
      const zip = typeof JSZip !== "undefined" ? new JSZip() : null;
      for (let i = 0; i < n; i++) {
        status(`Страница ${i + 1} из ${n}…`);
        const out = await PDFDocument.create();
        out.addPage((await out.copyPages(src, [i]))[0]);
        const bytes = await out.save(), name = `${base()}_стр${String(i + 1).padStart(2, "0")}.pdf`;
        zip ? zip.file(name, bytes) : download(bytes, name);
      }
      if (zip) download(await zip.generateAsync({ type: "uint8array" }), `${base()}_по_страницам.zip`, "application/zip");
      status(`Готово: ${n} файлов${zip ? " в ZIP-архиве" : ""} ✅`, "ok");
    }
    if (cur.id === "rotate") {
      const doc = await loadPdf(files[0]), idx = parsePages(opt("pages"), doc.getPageCount()), a = +opt("angle");
      idx.forEach(i => { const p = doc.getPage(i); p.setRotation(degrees((p.getRotation().angle + a) % 360)); });
      download(await doc.save(), `${base()}_повёрнутый.pdf`);
      status(`Готово: повернул ${idx.length} стр. ✅`, "ok");
    }
    if (cur.id === "number") {
      const doc = await loadPdf(files[0]), n = doc.getPageCount();
      const from = Math.max(1, parseInt(opt("from")) || 1);
      if (from > n) throw new Error(`В файле только ${n} стр.`);
      const font = await doc.embedFont(StandardFonts.Helvetica), fmt = opt("fmt"), pos = opt("pos"), size = 11;
      for (let i = from - 1; i < n; i++) {
        const p = doc.getPage(i), { width } = p.getSize(), k = i - from + 2, total = n - from + 1;
        const label = fmt === "nn" ? `${k} / ${total}` : fmt === "d" ? `- ${k} -` : `${k}`;
        const tw = font.widthOfTextAtSize(label, size);
        p.drawText(label, { x: pos === "r" ? width - 40 - tw : (width - tw) / 2, y: 24, size, font, color: rgb(0.25, 0.25, 0.3) });
      }
      download(await doc.save(), `${base()}_с_номерами.pdf`);
      status(`Готово: пронумеровал ${n - from + 1} стр. ✅`, "ok");
    }
  } catch (e) {
    console.error(e); status(e.message || "Что-то пошло не так", "err");
  } finally { go.disabled = false; }
}
