/* =========================================================
   ИПшич — калькуляторы (правила 2026 года, сверено 10.11.2026)
   Константы меняются раз в год — всё здесь, в R.
   ========================================================= */
const R = {
  FIX: 57390,          // фиксированные взносы ИП за полный 2026 год
  ONE_PCT_FROM: 300000,// 1% с дохода свыше
  ONE_PCT_MAX: 321818, // максимум 1%-ного взноса
  NPD_LIMIT: 2400000,  // лимит дохода самозанятого
  NPD_BONUS: 10000,    // стартовый налоговый вычет самозанятого
  NDS_FREE: 20000000,  // порог освобождения от НДС на УСН (доход прошлого года)
  USN_LIMIT: 490500000 // лимит дохода УСН
};

/* ---------- утилиты ---------- */
const $ = id => document.getElementById(id);
const num = el => { const v = parseFloat(String(el.value).replace(/\s/g, "").replace(",", ".")); return isFinite(v) && v > 0 ? v : 0; };
const rub = (v, k) => (k ? v.toLocaleString("ru-RU", {minimumFractionDigits: 2, maximumFractionDigits: 2}) : Math.round(v).toLocaleString("ru-RU")) + " ₽";
function fmtInput(el) {            // «1200000» → «1 200 000» прямо при вводе
  el.addEventListener("input", () => {
    const pos = el.value.length - el.selectionStart;
    const raw = el.value.replace(/[^\d,.]/g, "");
    const [i, d] = raw.split(/[,.]/);
    const out = (i ? Number(i).toLocaleString("ru-RU") : "") + (d !== undefined ? "," + d.slice(0, 2) : "");
    el.value = out;
    const p = Math.max(0, out.length - pos); el.setSelectionRange(p, p);
  });
}
function seg(id, cb) {
  const box = $(id);
  box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    cb(b.dataset.v);
  }));
  return () => box.querySelector("button.on").dataset.v;
}
function bump(box) { box.querySelectorAll(".rcpt").forEach(r => { r.classList.remove("bump"); void r.offsetWidth; r.classList.add("bump"); }); }
function ln(a, b) { return `<div class="ln"><span>${a}</span><span>${b}</span></div>`; }
function copyBtn(text) { return `<button class="copy" data-copy="${encodeURIComponent(text)}">📋 Скопировать расчёт</button>`; }
document.addEventListener("click", e => {
  const b = e.target.closest(".copy"); if (!b) return;
  const t = decodeURIComponent(b.dataset.copy);
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
    () => { b.textContent = "✅ Скопировано"; setTimeout(() => b.textContent = "📋 Скопировать расчёт", 1600); },
    () => { b.textContent = "Не получилось скопировать"; });
});

/* взносы за полный год */
function vznosy(base) {
  const one = Math.min(R.ONE_PCT_MAX, Math.max(0, (base - R.ONE_PCT_FROM) * 0.01));
  return { fix: R.FIX, one, all: R.FIX + one };
}

/* ---------- вкладки ---------- */
document.querySelectorAll("#ctabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#ctabs button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll(".cpane").forEach(p => p.classList.toggle("on", p.id === "p-" + b.dataset.p));
}));

/* =========================================================
   1. Что выгоднее: НПД / УСН 6% / УСН 15%
   ========================================================= */
const cInc = $("c-inc"), cExp = $("c-exp"), cB2b = $("c-b2b"), cBonus = $("c-bonus");
[cInc, cExp].forEach(fmtInput);

function calcCmp() {
  const inc = num(cInc), exp = Math.min(num(cExp), inc), share = cB2b.value / 100;
  $("c-b2b-v").textContent = cB2b.value + "%";

  // самозанятость
  let npdTax = inc * (share * 0.06 + (1 - share) * 0.04);
  const bonus = cBonus.checked ? Math.min(R.NPD_BONUS, inc * (share * 0.02 + (1 - share) * 0.01)) : 0;
  npdTax -= bonus;
  const npdOk = inc <= R.NPD_LIMIT;

  // УСН 6%
  const v6 = vznosy(inc);
  const t6 = inc * 0.06, pay6 = Math.max(0, t6 - v6.all), total6 = v6.all + pay6;

  // УСН 15%
  const v15 = vznosy(Math.max(0, inc - exp));
  const base15 = Math.max(0, inc - exp - v15.all);
  const t15calc = base15 * 0.15, tMin = inc * 0.01, t15 = Math.max(t15calc, tMin), total15 = v15.all + t15;

  const opts = [
    { key: "npd", ok: npdOk, total: npdTax },
    { key: "u6", ok: inc <= R.USN_LIMIT, total: total6 },
    { key: "u15", ok: inc <= R.USN_LIMIT, total: total15 }
  ];
  const best = opts.filter(o => o.ok).sort((a, b) => a.total - b.total)[0];
  const tag = (o) => !o.ok ? '<span class="tag bad">не подходит</span>' : (best && o.key === best.key ? '<span class="tag">✓ выгоднее всего</span>' : "");
  const per = (v) => `<div class="per">≈ ${rub(v / 12)} в месяц · ${inc ? (v / inc * 100).toFixed(1).replace(".", ",") : 0}% от дохода</div>`;
  const ndsWarn = inc > R.NDS_FREE ? `<div class="warn">Доход больше 20 млн ₽ — со следующего года на УСН появится НДС (5%, 7% или 22%). В расчёте не учтён.</div>` : "";

  const html =
    `<div class="rcpt ${!npdOk ? "na" : ""} ${best && best.key === "npd" ? "best" : ""}">
      <h4>🧑‍💻 Самозанятость (НПД) ${tag(opts[0])}</h4>
      ${ln("Налог 4% / 6%", rub(npdTax + bonus))}
      ${bonus ? ln("Стартовый бонус", "−" + rub(bonus)) : ""}
      ${ln("Взносы", "не обязательны")}
      <div class="tot"><span>Итого</span><b>${rub(npdTax)}</b></div>${per(npdTax)}
      ${!npdOk ? `<div class="warn">Доход больше 2,4 млн ₽ — самозанятость не подходит.</div>` : `<div class="hint" style="margin-top:8px">Нельзя: сотрудники и перепродажа чужих товаров.</div>`}
    </div>
    <div class="rcpt ${best && best.key === "u6" ? "best" : ""}">
      <h4>📄 ИП на УСН «Доходы» 6% ${tag(opts[1])}</h4>
      ${ln("Налог 6% от дохода", rub(t6))}
      ${ln("Взносы фиксированные", rub(v6.fix))}
      ${ln("Взносы 1% свыше 300 тыс.", rub(v6.one))}
      ${ln("Налог после вычета взносов", rub(pay6))}
      <div class="tot"><span>Итого</span><b>${rub(total6)}</b></div>${per(total6)}${ndsWarn}
    </div>
    <div class="rcpt ${best && best.key === "u15" ? "best" : ""}">
      <h4>📊 ИП на УСН «Доходы − расходы» 15% ${tag(opts[2])}</h4>
      ${ln("База: доходы − расходы − взносы", rub(base15))}
      ${ln(t15calc >= tMin ? "Налог 15%" : "Минимальный налог 1% от дохода", rub(t15))}
      ${ln("Взносы фиксированные", rub(v15.fix))}
      ${ln("Взносы 1%", rub(v15.one))}
      <div class="tot"><span>Итого</span><b>${rub(total15)}</b></div>${per(total15)}
    </div>
    <div class="adv">Выбрал режим? Следующий шаг — счёт для ИП. <a href="#banks">Сравнить банки →</a></div>
    ${copyBtn(`Расчёт ИПшич (2026): доход ${rub(inc)}, расходы ${rub(exp)}\nСамозанятость: ${npdOk ? rub(npdTax) : "не подходит"}\nУСН 6%: ${rub(total6)}\nУСН 15%: ${rub(total15)}`)}`;
  $("c-out").innerHTML = html;
  bump($("c-out"));
}
[cInc, cExp, cB2b, cBonus].forEach(el => el.addEventListener("input", calcCmp));
cBonus.addEventListener("change", calcCmp);

/* =========================================================
   2. Взносы ИП (с неполным годом)
   ========================================================= */
const vInc = $("v-inc"), vExp = $("v-exp"), vFrom = $("v-from"), vTo = $("v-to");
[vInc, vExp].forEach(fmtInput);
const vMode = seg("v-mode", m => { $("v-exp-f").style.display = m === "net" ? "" : "none"; calcVz(); });

function fixedPart(from, to) {
  // годовая сумма / 12 за полный месяц; неполный месяц — по календарным дням (ст. 430 НК РФ)
  const Y = 2026, perMonth = R.FIX / 12;
  const s = from || new Date(Y, 0, 1), e = to || new Date(Y, 11, 31);
  if (e < s) return 0;
  let sum = 0;
  for (let m = 0; m < 12; m++) {
    const first = new Date(Y, m, 1), last = new Date(Y, m + 1, 0), dim = last.getDate();
    const a = s > first ? s : first, b = e < last ? e : last;
    if (b < a) continue;
    const days = Math.round((b - a) / 864e5) + 1;
    sum += days === dim ? perMonth : perMonth / dim * days;
  }
  return Math.round(sum * 100) / 100;
}
function parseDate(el) { if (!el.value) return null; const [y, m, d] = el.value.split("-").map(Number); return new Date(y, m - 1, d); }

function calcVz() {
  const inc = num(vInc), exp = vMode() === "net" ? num(vExp) : 0;
  const base = Math.max(0, inc - exp);
  const from = parseDate(vFrom), to = parseDate(vTo);
  const fix = fixedPart(from, to);
  const one = Math.min(R.ONE_PCT_MAX, Math.max(0, (base - R.ONE_PCT_FROM) * 0.01));
  const all = fix + one;
  const partial = from || to;
  $("v-out").innerHTML =
    `<div class="rcpt best">
      <h4>🧾 Взносы ИП за 2026 год <span class="tag">${partial ? "неполный год" : "полный год"}</span></h4>
      ${ln("Фиксированная часть (ОПС + ОМС)", rub(fix, true))}
      ${ln("1% с дохода свыше 300 000 ₽", rub(one, true))}
      ${ln("База для 1%", rub(base))}
      <div class="tot"><span>Всего взносов</span><b>${rub(all, true)}</b></div>
      <div class="per">максимум за год — 379 208 ₽</div>
    </div>
    <div class="rcpt">
      <h4>📅 Когда платить</h4>
      ${ln("Фиксированная часть", to ? "в течение 15 дней после закрытия" : "до 28 декабря 2026")}
      ${ln("1% с дохода", to ? "при закрытии уточни срок в ФНС" : "до 1 июля 2027")}
      <div class="hint" style="margin-top:10px">Можно платить частями в течение года. На УСН «Доходы» уплаченные взносы уменьшают налог.</div>
    </div>
    ${copyBtn(`Взносы ИП за 2026 (ИПшич): фиксированные ${rub(fix, true)} + 1% ${rub(one, true)} = ${rub(all, true)}`)}`;
  bump($("v-out"));
}
[vInc, vExp, vFrom, vTo].forEach(el => el.addEventListener("input", calcVz));

/* =========================================================
   3. НДС
   ========================================================= */
const nSum = $("n-sum");
fmtInput(nSum);
const nMode = seg("n-mode", m => { $("n-lab").textContent = m === "add" ? "Сумма без НДС" : "Сумма с НДС"; calcNds(); });
const nRate = seg("n-rate", () => calcNds());
function calcNds() {
  const s = num(nSum), r = Number(nRate()), add = nMode() === "add";
  const r2 = x => Math.round(x * 100) / 100;
  let without, nds, withN;
  if (add) { without = s; nds = r2(s * r / 100); withN = r2(s + nds); }
  else { withN = s; nds = r2(s * r / (100 + r)); without = r2(s - nds); }
  $("n-out").innerHTML =
    `<div class="rcpt best">
      <h4>🧮 ${add ? "Начислить" : "Выделить"} НДС <span class="tag">ставка ${r}%</span></h4>
      ${ln("Сумма без НДС", rub(without, true))}
      ${ln("НДС " + r + "%", rub(nds, true))}
      <div class="tot"><span>Сумма с НДС</span><b>${rub(withN, true)}</b></div>
      ${!add && r ? `<div class="per">формула: сумма × ${r} / ${100 + r}</div>` : ""}
    </div>
    <div class="hint">ИП на УСН с доходом за прошлый год до 20 млн ₽ освобождены от НДС — тогда в счёте пишут «Без НДС».</div>
    ${copyBtn(`НДС ${r}%: без НДС ${rub(without, true)}, НДС ${rub(nds, true)}, с НДС ${rub(withN, true)}`)}`;
  bump($("n-out"));
}
nSum.addEventListener("input", calcNds);

/* ---------- примеры ---------- */
document.querySelectorAll(".example").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.ex === "cmp") { cInc.value = "3 000 000"; cExp.value = "1 900 000"; cB2b.value = 30; calcCmp(); }
  if (b.dataset.ex === "vz") { vInc.value = "250 000"; vFrom.value = "2026-03-15"; vTo.value = ""; calcVz(); }
}));

calcCmp(); calcVz(); calcNds();
