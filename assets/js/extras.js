/* Liwan — дополнения к блоку Tilda: свет фонаря, «Карта путника», «Напомнить» в афише, след на песке.
   Грузится блоком после заставки (window.LIWAN_RT), лежит на хостинге рядом с картинками: в блок T123 не помещается.
   Тексты карт — в массиве DECK ниже: чай и фразу можно менять, код карты (QS, KH…) — имя файла в assets/cards. */
(() => {
  const LW = document.getElementById("liwan"), RT = window.LIWAN_RT;
  if (!LW || !RT || LW.dataset.extras) return;
  LW.dataset.extras = "1";
  const $ = (s, r = LW) => r.querySelector(s);
  const url = RT.url;
  const SITE = "https://liwan-lounge.ru/";
  const BOOK = "https://reservation.yandex.ru/partner-reserve/forms/03fcde06-37b9-4221-a463-c06049b48a12";
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mskToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); /* дата по Москве */
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим — без памяти */ } } };

  /* звёзды и полумесяцы, как прорези в марокканском фонаре */
  const ORNAMENT = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='132' height='132'><g fill='#ffd8a0'>" +
    "<rect x='57' y='57' width='18' height='18'/><rect x='57' y='57' width='18' height='18' transform='rotate(45 66 66)'/>" +
    "<path d='M5 3a10 10 0 1 0 13 13 8 8 0 1 1-13-13z'/><path d='M71 69a10 10 0 1 0 13 13 8 8 0 1 1-13-13z' transform='translate(-5 -66)'/>" +
    "<circle cx='66' cy='12' r='2.6'/><circle cx='12' cy='66' r='2.6'/><circle cx='120' cy='66' r='2.6'/><circle cx='66' cy='120' r='2.6'/>" +
    "<path d='M33 26q4 7 0 14-4-7 0-14zM99 92q4 7 0 14-4-7 0-14zM99 26q4 7 0 14-4-7 0-14zM33 92q4 7 0 14-4-7 0-14z'/></g></svg>");

  const css = `
#liwan .lamp { position: fixed; inset: 0; z-index: 19; pointer-events: none; overflow: hidden; opacity: 0; transition: opacity 1.8s var(--ease); }
#liwan .lamp.on { opacity: 1; }
#liwan .lamp i { position: absolute; left: 0; top: 0; display: block; will-change: transform; }
#liwan .lamp-d { width: 300vmax; height: 300vmax; margin: -150vmax 0 0 -150vmax; background: radial-gradient(circle closest-side, rgba(10, 6, 4, 0) 6%, rgba(10, 6, 4, .22) 24%, rgba(10, 6, 4, .3) 100%); }
#liwan .lamp-g { width: 80vmin; height: 80vmin; margin: -40vmin 0 0 -40vmin; border-radius: 50%; overflow: hidden;
  background: radial-gradient(circle closest-side, rgba(255, 186, 110, .2), rgba(255, 160, 80, .07) 55%, rgba(255, 160, 80, 0));
  -webkit-mask-image: radial-gradient(circle closest-side, #000 25%, transparent); mask-image: radial-gradient(circle closest-side, #000 25%, transparent); }
#liwan .lamp-p { width: 100vw; height: 100vh; opacity: .24; background: url("${ORNAMENT}") 0 0 / 132px 132px repeat; }
@media (max-width: 767px) { #liwan .lamp-p { opacity: .2; background-size: 96px 96px; } }

#liwan .tc { position: relative; scroll-margin-top: 40px; margin: 0 var(--rail); overflow: hidden; isolation: isolate; background: radial-gradient(90% 80% at 75% 45%, #3a1018, #1a0a0c 70%); }
#liwan .tc-in { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: clamp(32px, 5vw, 96px); min-height: 100vh; min-height: 100svh; padding: clamp(72px, 12vh, 130px) clamp(28px, 5vw, 88px); }
#liwan .tc .eyebrow { margin-bottom: clamp(22px, 4vh, 40px); }
#liwan .tc-h { margin: 0; font: 400 clamp(40px, 5.2vw, 84px)/1 var(--display); letter-spacing: -.01em; text-wrap: balance; }
#liwan .tc-lead { max-width: 34ch; margin: 22px 0 0; font: 300 clamp(17px, 1.35vw, 20px)/1.5 var(--text); opacity: .85; }
#liwan .tc-res[hidden], #liwan .tc-pre[hidden] { display: none; }
#liwan .tc-who { margin: 0; font: 500 12px/1.4 var(--text); letter-spacing: .22em; text-transform: uppercase; color: var(--brass); }
#liwan .tc-tea { margin: 16px 0 0; font: 400 clamp(40px, 5vw, 76px)/1.02 var(--display); text-wrap: balance; }
#liwan .tc-say { max-width: 30ch; margin: 20px 0 0; font: 300 clamp(18px, 1.5vw, 22px)/1.5 var(--text); }
#liwan .tc-note { margin: 18px 0 0; font: 300 13px/1.4 var(--text); opacity: .6; }
#liwan .tc-res > * { animation: lw-tc-in .9s var(--ease) both; animation-delay: calc(var(--i, 0) * 110ms + .5s); }
@keyframes lw-tc-in { from { opacity: 0; translate: 0 16px; } }
#liwan .tc-deck { position: relative; justify-self: center; width: min(340px, 72vw, 100%); aspect-ratio: 744 / 1039; padding: 0; border: 0; background: none; cursor: pointer; perspective: 1600px; -webkit-tap-highlight-color: transparent; }
#liwan .tc-deck::before, #liwan .tc-deck::after { content: ""; position: absolute; inset: 0; border-radius: 5% / 3.6%; background: var(--back) center / cover; box-shadow: 0 20px 50px rgba(0, 0, 0, .45); }
#liwan .tc-deck::before { transform: rotate(-7deg) translate(-6%, 2%); filter: brightness(.6); }
#liwan .tc-deck::after { transform: rotate(4deg) translate(5%, 1%); filter: brightness(.75); }
#liwan .tc-card { position: absolute; inset: 0; z-index: 1; transform-style: preserve-3d; transition: transform 1.2s cubic-bezier(.2, .75, .2, 1); }
#liwan .tc-deck:hover .tc-card, #liwan .tc-deck:focus-visible .tc-card { transform: translateY(-14px) rotate(-1.5deg); }
#liwan .tc-card.flip, #liwan .tc-deck:hover .tc-card.flip { transform: translateY(-8px) rotateY(180deg); }
#liwan .tc-card img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 5% / 3.6%; -webkit-backface-visibility: hidden; backface-visibility: hidden; box-shadow: 0 34px 80px rgba(0, 0, 0, .6), 0 0 0 1px rgba(249, 238, 210, .08); }
#liwan .tc-card .tc-face { transform: rotateY(180deg); }
#liwan .tc-tap { position: absolute; left: 0; right: 0; bottom: -46px; font: 400 12px/1 var(--text); letter-spacing: .14em; text-transform: uppercase; text-align: center; color: var(--brass); transition: opacity .4s; }
#liwan .tc-deck.done .tc-tap { opacity: 0; }
#liwan .tc-in > * { opacity: 0; translate: 0 22px; transition: opacity 1s var(--ease), translate 1s var(--ease); }
#liwan .tc-in > :last-child { transition-delay: .15s; }
#liwan .tc.in .tc-in > * { opacity: 1; translate: 0 0; }

#liwan .sign { margin: 0 var(--rail); padding: clamp(64px, 11vh, 120px) clamp(28px, 5vw, 88px) clamp(56px, 9vh, 100px); }
#liwan .sign .eyebrow { margin-bottom: 18px; }
#liwan .sign-top { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 32px; margin-bottom: 28px; }
#liwan .sign-top p { margin: 0; max-width: 40ch; font: 300 clamp(17px, 1.35vw, 20px)/1.5 var(--text); opacity: .85; }
#liwan .sign-field { position: relative; height: clamp(240px, 42vh, 420px); overflow: hidden; border-radius: 2px; background: #c89560 center / cover; touch-action: none; cursor: crosshair; box-shadow: inset 0 0 0 1px rgba(249, 238, 210, .08); }
#liwan .sign-field canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#liwan .sign-field .sw { pointer-events: none; }
#liwan .sign-field .sf { image-rendering: auto; }
#liwan .sign-hint { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 10px 18px; border-radius: 999px; background: rgba(27, 19, 16, .55); font: 400 13px/1 var(--text); letter-spacing: .08em; white-space: nowrap; pointer-events: none; transition: opacity .6s var(--ease); }
#liwan .sign-field.drawn .sign-hint { opacity: 0; }

@media (max-width: 767px) {
  #liwan .tc, #liwan .sign { margin: 0; }
  #liwan .tc-in { grid-template-columns: 1fr; gap: 64px; min-height: 0; padding: 72px 20px 96px; }
  #liwan .tc-deck { order: 2; }
  #liwan .sign { padding: 64px 20px 56px; }
  #liwan .sign-field { height: 260px; }
}
`;
  const style = document.createElement("style");
  style.textContent = css;
  LW.appendChild(style);

  /* =================== свет фонаря: тёплое пятно с узором, следует за курсором (на телефоне — за пальцем и само покачивается) =================== */
  (function lamp() {
    if (RT.reduce()) return;
    const L = document.createElement("div");
    L.className = "lamp"; L.setAttribute("aria-hidden", "true");
    L.innerHTML = '<i class="lamp-d"></i><i class="lamp-g"><i class="lamp-p"></i></i>';
    LW.appendChild(L);
    const d = L.children[0], g = L.children[1], p = g.firstChild;
    let x = innerWidth / 2, y = innerHeight * .4, tx = x, ty = y, lastInput = -1e9, raf = 0;
    const place = () => {
      d.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      g.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      p.style.transform = "translate3d(calc(40vmin - " + x.toFixed(1) + "px),calc(40vmin - " + y.toFixed(1) + "px),0)"; /* узор стоит на месте, свет его «проявляет» */
    };
    const tick = (now) => {
      raf = 0;
      if (!finePointer && now - lastInput > 2500) { /* без касаний фонарь покачивается сам */
        tx = innerWidth * (.5 + .28 * Math.sin(now / 3100)); ty = innerHeight * (.42 + .14 * Math.sin(now / 4300 + 1));
      }
      x += (tx - x) * (finePointer ? .14 : .05); y += (ty - y) * (finePointer ? .14 : .05);
      place();
      if (!finePointer || Math.abs(tx - x) > .4 || Math.abs(ty - y) > .4) raf = requestAnimationFrame(tick);
    };
    const go = () => { if (!raf && L.classList.contains("on")) raf = requestAnimationFrame(tick); };
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; lastInput = performance.now(); go(); }, { passive: true });
    addEventListener("pointerdown", (e) => { tx = e.clientX; ty = e.clientY; lastInput = performance.now(); go(); }, { passive: true });
    const set = (on) => { L.classList.toggle("on", on); if (on) go(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    LW.addEventListener("lw:pause", (e) => set(!e.detail));
    place();
    requestAnimationFrame(() => set(!RT.paused()));
  })();

  /* =================== «Напомнить» в афише Weekend: файл .ics (iPhone, Mac, Outlook) или Google Календарь на Android =================== */
  (function remind() {
    const sec = $("#weekend");
    if (!sec) return;
    const two = (n) => String(n).padStart(2, "0");
    const stamp = (t) => { const d = new Date(t); return d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + "T" + two(d.getUTCHours()) + two(d.getUTCMinutes()) + "00Z"; };
    const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
    const WHERE = "Liwan, Москва, ул. Авиаконструктора Миля, 3А, фудмолл «Привоз», 2-й этаж";
    /* время в афише — московское: «22:00» или «21:00–00:00»; конец раньше начала — значит, после полуночи */
    function span(e) {
      const [y, m, dd] = e.date.split("-").map(Number);
      const tm = String(e.time || "").match(/(\d{1,2}):(\d{2})(?:\D+(\d{1,2}):(\d{2}))?/);
      if (!tm) return null;
      const s = Date.UTC(y, m - 1, dd, +tm[1] - 3, +tm[2]);
      let f = tm[3] ? Date.UTC(y, m - 1, dd, +tm[3] - 3, +tm[4]) : s + 3 * 3600e3;
      if (f <= s) f += 24 * 3600e3;
      return [s, f];
    }
    function ics(e) {
      const t = span(e), [y, m, dd] = e.date.split("-");
      const when = t ? ["DTSTART:" + stamp(t[0]), "DTEND:" + stamp(t[1])] : ["DTSTART;VALUE=DATE:" + y + m + dd];
      return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Liwan//Weekend//RU", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
        "UID:" + e.date + "-" + encodeURIComponent(e.name).slice(0, 40) + "@liwan-lounge.ru", "DTSTAMP:" + stamp(Date.now()), ...when,
        "SUMMARY:" + esc("Liwan · " + e.name), "LOCATION:" + esc(WHERE), "DESCRIPTION:" + esc([e.kind, e.time, "Бронь: " + BOOK].filter(Boolean).join("\n")),
        "URL:" + (e.url || SITE), "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc("Сегодня в Liwan: " + e.name), "TRIGGER:-PT3H", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    }
    function google(e) {
      const t = span(e), day = e.date.replace(/-/g, "");
      const next = new Date(Date.UTC(+e.date.slice(0, 4), +e.date.slice(5, 7) - 1, +e.date.slice(8, 10) + 1)).toISOString().slice(0, 10).replace(/-/g, "");
      return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Liwan · " + e.name) +
        "&dates=" + (t ? stamp(t[0]) + "/" + stamp(t[1]) : day + "/" + next) + "&location=" + encodeURIComponent(WHERE) +
        "&details=" + encodeURIComponent([e.kind, e.time, "Бронь: " + BOOK].filter(Boolean).join("\n")) + "&ctz=Europe/Moscow";
    }
    const android = /Android/i.test(navigator.userAgent);
    let cur = LW.lwEvent || null, btn = null;
    function ensure() {
      const acts = $(".wk-acts", sec);
      if (!acts || btn) return;
      btn = document.createElement("a");
      btn.className = "wk-btn wk-cal"; btn.textContent = "Напомнить";
      btn.setAttribute("aria-label", "Добавить событие в календарь с напоминанием");
      acts.appendChild(btn);
      btn.addEventListener("click", (ev) => {
        if (!cur) return;
        if (android) { btn.href = google(cur); btn.target = "_blank"; btn.rel = "noopener"; return; } /* Google Календарь не открывает .ics */
        ev.preventDefault();
        const blob = new Blob([ics(cur)], { type: "text/calendar;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "liwan-" + cur.date + ".ics";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
    }
    LW.addEventListener("lw:event", (e) => { cur = e.detail; ensure(); });
    if (cur) ensure();
  })();

  /* =================== «Карта путника»: колода Liwan, одна карта в день — чай на сегодня и фраза; можно поделиться картинкой =================== */
  const DECK = [
    ["AS", "Туз пик · Луна над дюнами", "Шен Пуэр", "Ночь длинная, торопиться некуда. Возьми чай, который раскрывается не сразу."],
    ["AH", "Туз червей · Оазис", "Розовый с яблоком", "Ты нашёл свой оазис. Задержись в нём подольше."],
    ["AD", "Туз бубен · Караван", "Да Хун Пао", "Дорога подождёт. Сначала привал и чай с лёгким дымком."],
    ["AC", "Туз треф · Фонарь", "Те Гуань Инь", "Фонарь горит для тех, кто возвращается. Сегодня он горит для тебя."],
    ["JS", "Валет пик · Музыкант", "Молочный Улун", "Одна мелодия не звучит дважды одинаково. И этот вечер тоже."],
    ["JH", "Валет червей · Хранитель огня", "Дянь Хун", "Береги тепло. Красный чай согреет руки и мысли."],
    ["JD", "Валет бубен · Сокольник", "Цзинь Цзунь Мей", "Зоркий взгляд видит детали. Попробуй чай, в котором их много."],
    ["JC", "Валет треф · Барабанщик", "Марокканский", "Ритм вечера задаёшь ты. Марокканский чай — для бодрого шага."],
    ["QS", "Дама пик · Хранительница тишины", "Бай Мудань", "Тишина — тоже разговор. Белый чай для неспешной беседы."],
    ["QH", "Дама червей · Гранат", "Дун Фан Мей Жень", "Сладкое достаётся тем, кто умеет ждать."],
    ["QD", "Дама бубен · Веер", "Жасмин", "Лёгкий ветер приносит хорошие вести. Жасмин — для лёгкого настроения."],
    ["QC", "Дама треф · Финиковая пальма", "Лао Гун Мей", "Финики, тёплый чай и хорошая компания — Восток придумал это давно."],
    ["KS", "Король пик · Фонарщик", "Шу Гун Тин", "В темноте дорога короче, если рядом хороший спутник."],
    ["KH", "Король червей · Кофейник", "Кофе в турке", "Даже короли иногда изменяют чаю. Сегодня — кофе в турке."],
    ["KD", "Король бубен · Купец", "Фен Хуан Дан Цун", "Всё взвешено и решено. Осталось выбрать чай — он уже выбран."],
    ["KC", "Король треф · Звездочёт", "Мен Хай Гу Шу", "Звёзды сошлись: хороший вечер, чтобы никуда не спешить."],
    ["JOKER1", "Джокер · Дервиш", "Габа Бриллиант", "Сегодня можно всё. Даже второй чайник."],
    ["JOKER2", "Джокер · Фенек", "Тибетская Ромашка", "Маленький лис знает: главное — найти тёплое место. Ты его нашёл."]
  ];
  (function cards() {
    const anchor = $(".about");
    if (!anchor) return;
    const sec = document.createElement("section");
    sec.className = "tc"; sec.id = "karta"; sec.setAttribute("aria-labelledby", "h-karta");
    sec.innerHTML = '<div class="tc-in"><div>' +
      '<h2 class="eyebrow" id="h-karta">Карта путника</h2>' +
      '<div class="tc-pre"><p class="tc-h">Какой чай сегодня ваш?</p><p class="tc-lead">Вытяните карту из колоды Liwan — она подскажет. Одна карта в день.</p>' +
      '<div class="wk-acts"><button class="wk-btn main tc-go" type="button">Вытянуть карту</button></div></div>' +
      '<div class="tc-res" aria-live="polite" hidden><p class="tc-who" style="--i:0"></p><p class="tc-tea" style="--i:1"></p><p class="tc-say" style="--i:2"></p>' +
      '<div class="wk-acts" style="--i:3"><button class="wk-btn main tc-share" type="button">Поделиться картой</button><a class="wk-btn" href="' + BOOK + '" target="_blank" rel="noopener">Забронировать стол</a></div>' +
      '<p class="tc-note" style="--i:4">Новая карта — завтра.</p></div>' +
      '</div><button class="tc-deck" type="button" aria-label="Вытянуть карту"><span class="tc-card"><img class="tc-back" alt="" decoding="async"><img class="tc-face" alt="" decoding="async"></span><span class="tc-tap">Нажмите на колоду</span></button></div>';
    anchor.before(sec);
    const deck = $(".tc-deck", sec), card = $(".tc-card", sec), face = $(".tc-face", sec), res = $(".tc-res", sec), pre = $(".tc-pre", sec);
    const back = url("cards/BACK.jpg");
    deck.style.setProperty("--back", 'url("' + back + '")');
    $(".tc-back", sec).src = back;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { sec.classList.add("in"); io.disconnect(); } }, { threshold: .15 });
      io.observe(sec);
    } else sec.classList.add("in");

    let pick = null, busy = false;
    function draw() {
      if (busy) return;
      if (pick) { card.classList.toggle("flip"); return; } /* уже вытянута — переворачиваем туда-обратно */
      busy = true;
      const today = mskToday(), saved = store.get("lw-card");
      let c = saved && saved.d === today && DECK.find((x) => x[0] === saved.c);
      if (!c) {
        const pool = DECK.filter((x) => !saved || x[0] !== saved.c); /* вчерашняя карта не выпадает два дня подряд */
        c = pool[(Math.random() * pool.length) | 0];
        store.set("lw-card", { d: today, c: c[0] });
      }
      pick = c;
      const img = new Image();
      img.crossOrigin = "anonymous"; /* картинка нужна и для «Поделиться» — холст не должен быть «грязным» */
      const reveal = () => {
        face.src = img.src; face.alt = c[1];
        requestAnimationFrame(() => { card.classList.add("flip"); deck.classList.add("done"); deck.setAttribute("aria-label", "Перевернуть карту"); });
        $(".tc-who", res).textContent = c[1]; $(".tc-tea", res).textContent = c[2]; $(".tc-say", res).textContent = c[3];
        pre.hidden = true; res.hidden = false; busy = false;
      };
      img.onload = reveal; img.onerror = reveal;
      img.src = url("cards/" + c[0] + ".jpg");
      face.crossOrigin = "anonymous";
    }
    deck.addEventListener("click", draw);
    $(".tc-go", sec).addEventListener("click", draw);

    /* картинка 1080×1920 для сторис и мессенджеров */
    function wrap(ctx, text, maxW) {
      const words = text.split(" "), lines = [];
      let line = "";
      for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line);
      return lines;
    }
    async function render(c) {
      const W = 1080, H = 1920, cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const x = cv.getContext("2d");
      if (document.fonts && document.fonts.load) {
        await Promise.race([Promise.all([document.fonts.load('400 80px "Tenor Sans"'), document.fonts.load('300 40px Inter'), document.fonts.load('500 28px Inter')]), new Promise((r) => setTimeout(r, 1500))]);
      }
      const bg = x.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#3a1018"); bg.addColorStop(1, "#140709");
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      const glow = x.createRadialGradient(W / 2, 700, 40, W / 2, 700, 760);
      glow.addColorStop(0, "rgba(255,190,120,.16)"); glow.addColorStop(1, "rgba(255,190,120,0)");
      x.fillStyle = glow; x.fillRect(0, 0, W, H);
      x.textAlign = "center"; x.fillStyle = "#B58B5A";
      x.font = '500 28px Inter, sans-serif';
      if ("letterSpacing" in x) x.letterSpacing = "9px";
      x.fillText("КАРТА ПУТНИКА · LIWAN", W / 2, 170);
      if ("letterSpacing" in x) x.letterSpacing = "0px";
      const cw = 660, chh = Math.round(cw * 1039 / 744), cx = (W - cw) / 2, cy = 230;
      x.save(); x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 70; x.shadowOffsetY = 30;
      x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, cw, chh, 33); else x.rect(cx, cy, cw, chh); x.fillStyle = "#30080E"; x.fill(); x.restore();
      x.save(); x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, cw, chh, 33); else x.rect(cx, cy, cw, chh); x.clip();
      if (face.complete && face.naturalWidth) x.drawImage(face, cx, cy, cw, chh);
      x.restore();
      let y = cy + chh + 110;
      x.fillStyle = "#B58B5A"; x.font = '500 30px Inter, sans-serif';
      if ("letterSpacing" in x) x.letterSpacing = "5px";
      x.fillText(c[1].toUpperCase(), W / 2, y);
      if ("letterSpacing" in x) x.letterSpacing = "0px";
      x.fillStyle = "#F9EED2"; x.font = '400 88px "Tenor Sans", Georgia, serif';
      for (const l of wrap(x, c[2], 920)) { y += 104; x.fillText(l, W / 2, y); }
      x.font = '300 40px Inter, sans-serif'; x.fillStyle = "rgba(249,238,210,.88)"; y += 40;
      for (const l of wrap(x, c[3], 860)) { y += 58; x.fillText(l, W / 2, y); }
      x.fillStyle = "rgba(249,238,210,.62)"; x.font = '300 30px Inter, sans-serif';
      x.fillText("Лаунж-бар и чайная в Жулебино", W / 2, H - 120);
      x.fillStyle = "#F9EED2"; x.font = '500 32px Inter, sans-serif';
      x.fillText("liwan-lounge.ru", W / 2, H - 70);
      return new Promise((r) => cv.toBlob(r, "image/jpeg", .9));
    }
    $(".tc-share", sec).addEventListener("click", async () => {
      if (!pick) return;
      const c = pick, text = "Моя карта путника в Liwan — " + c[1] + ". Чай на сегодня: " + c[2] + ".";
      let blob = null;
      try { blob = await render(c); } catch (e) { /* холст недоступен — делимся ссылкой */ }
      const file = blob && window.File ? new File([blob], "liwan-karta.jpg", { type: "image/jpeg" }) : null;
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: text + " " + SITE }); return; }
        if (navigator.share && !finePointer) { await navigator.share({ title: "Liwan", text, url: SITE }); return; }
      } catch (e) { if (e && e.name === "AbortError") return; }
      if (blob) { /* компьютер: сохраняем картинку */
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "liwan-karta-" + c[0] + ".jpg";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      } else open("https://t.me/share/url?url=" + encodeURIComponent(SITE) + "&text=" + encodeURIComponent(text), "_blank", "noopener");
    });
  })();

  /* =================== след на песке: рисунок пальцем, через пару секунд ветер его сдувает (механика страницы 404) =================== */
  (function sand() {
    const foot = $(".foot");
    if (!foot) return;
    const sec = document.createElement("section");
    sec.className = "sign"; sec.setAttribute("aria-labelledby", "h-sign");
    sec.innerHTML = '<div class="sign-top"><h2 class="eyebrow" id="h-sign">След на песке</h2><p>Напишите что-нибудь на память — ветер всё равно унесёт.</p></div>' +
      '<div class="sign-field"><canvas class="sf" aria-hidden="true"></canvas><canvas class="sw" aria-hidden="true"></canvas><span class="sign-hint">' +
      (finePointer ? "Рисуйте мышкой" : "Проведите пальцем") + '</span></div>';
    foot.before(sec);
    const box = $(".sign-field", sec), field = $(".sf", sec), wind = $(".sw", sec);
    let ctx, wctx;
    try { ctx = field.getContext("2d"); wctx = wind.getContext("2d"); } catch (e) { /* без холста — просто фото песка */ }
    const LX = -0.62 * Math.cos(.52), LY = -0.78 * Math.cos(.52), LZ = Math.sin(.52); /* низкое солнце слева сверху, как на фото */
    let W = 0, H = 0, C = 2, cw = 0, ch = 0, HD, img, data, ready = false;

    function size() {
      W = box.clientWidth; H = box.clientHeight;
      C = Math.max(1.5, Math.max(W, H) / 640);
      cw = Math.ceil(W / C); ch = Math.ceil(H / C);
      field.width = cw; field.height = ch;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      wind.width = Math.round(W * dpr); wind.height = Math.round(H * dpr); wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      HD = new Float32Array(cw * ch); img = ctx.createImageData(cw, ch); data = img.data;
      drawn = null; box.classList.remove("drawn");
    }
    function shade(x0, y0, x1, y1) {
      x0 = Math.max(1, x0 | 0); y0 = Math.max(1, y0 | 0); x1 = Math.min(cw - 2, x1 | 0); y1 = Math.min(ch - 2, y1 | 0);
      if (x1 < x0 || y1 < y0) return;
      const k = 1 / C;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * cw + x, h = HD[i];
        const gx = (HD[i + 1] - HD[i - 1]) * .5 * k, gy = (HD[i + cw] - HD[i - cw]) * .5 * k;
        const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const lam = (-gx * LX - gy * LY + LZ) * inv / LZ - 1;
        const p = i * 4;
        if (lam < 0 || h < -.3) { const a = Math.min(.82, Math.max(0, -lam) * 1.05 + Math.max(0, -h) * .018); data[p] = 62; data[p + 1] = 34; data[p + 2] = 12; data[p + 3] = a * 255; }
        else { data[p] = 255; data[p + 1] = 243; data[p + 2] = 218; data[p + 3] = Math.min(.6, lam * .9) * 255; }
      }
      ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
    /* летящие песчинки */
    let grains = [], wraf = 0, last = 0;
    function gust(n, x0, x1, y0, y1, spd) {
      for (let k = 0; k < n; k++) grains.push({ x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0), v: spd * (.6 + Math.random() * .8),
        dy: (Math.random() - .5) * 40, life: .4 + Math.random() * .7, age: 0, s: Math.random() < .7 ? 1.6 : 2.4,
        c: ["rgba(246,214,160,", "rgba(236,196,138,", "rgba(252,232,196,", "rgba(214,168,108,"][(Math.random() * 4) | 0] });
      if (!wraf) { last = performance.now(); wraf = requestAnimationFrame(blow); }
    }
    function blow(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      wctx.clearRect(0, 0, W, H);
      grains = grains.filter((g) => (g.age += dt) < g.life);
      for (const g of grains) {
        g.x += g.v * dt; g.y += g.dy * dt;
        const a = Math.min(1, g.age / .08) * Math.min(1, (g.life - g.age) / .2), len = Math.min(10, g.v * .007);
        wctx.lineWidth = g.s; wctx.lineCap = "round";
        wctx.strokeStyle = "rgba(90,50,18," + (.2 * a) + ")"; wctx.beginPath(); wctx.moveTo(g.x - len + 1.5, g.y + 2); wctx.lineTo(g.x + 1.5, g.y + 2); wctx.stroke();
        wctx.strokeStyle = g.c + (.8 * a) + ")"; wctx.beginPath(); wctx.moveTo(g.x - len, g.y); wctx.lineTo(g.x, g.y); wctx.stroke();
      }
      wraf = grains.length ? requestAnimationFrame(blow) : 0;
      if (!wraf) wctx.clearRect(0, 0, W, H);
    }
    /* бороздка с валиком по краям */
    const RAD = 6, DEEP = 5.5, RIM = 1.6;
    let drawing = false, px = 0, py = 0, dirty = null, drawn = null, sraf = 0, idle = 0, erasing = false;
    function stamp(ax, ay, bx, by) {
      const r = RAD / C, ro = r * 1.9;
      const x0 = Math.floor(Math.min(ax, bx) - ro), x1 = Math.ceil(Math.max(ax, bx) + ro), y0 = Math.floor(Math.min(ay, by) - ro), y1 = Math.ceil(Math.max(ay, by) + ro);
      const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
      for (let y = Math.max(1, y0); y <= Math.min(ch - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(cw - 2, x1); x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2));
        const dx = x - (ax + vx * t), dy = y - (ay + vy * t), d = Math.sqrt(dx * dx + dy * dy), i = y * cw + x;
        if (d < r) { const q = d / r; HD[i] = Math.min(HD[i], -DEEP * (1 - q * q)); }
        else if (d < ro && HD[i] > -.25) { const q = (d - r) / (ro - r); HD[i] = Math.max(HD[i], RIM * Math.sin(Math.PI * Math.min(1, q * 1.2)) * (1 - q * .4)); }
      }
      const b = { x0, y0, x1, y1 };
      dirty = dirty ? { x0: Math.min(dirty.x0, x0), y0: Math.min(dirty.y0, y0), x1: Math.max(dirty.x1, x1), y1: Math.max(dirty.y1, y1) } : b;
      drawn = drawn ? { x0: Math.min(drawn.x0, x0), y0: Math.min(drawn.y0, y0), x1: Math.max(drawn.x1, x1), y1: Math.max(drawn.y1, y1) } : { ...b };
    }
    const flush = () => { sraf = 0; if (dirty) { shade(dirty.x0 - 1, dirty.y0 - 1, dirty.x1 + 1, dirty.y1 + 1); dirty = null; } };
    const at = (e) => { const b = field.getBoundingClientRect(); return [(e.clientX - b.left) / C, (e.clientY - b.top) / C]; };
    /* ветер сдувает надпись слева направо */
    function erase() {
      if (!drawn || drawing) return;
      erasing = true;
      const d = drawn, from = d.x0 - 10, to = d.x1 + 10, t0 = performance.now(), dur = 1500;
      let prev = from;
      gust(120, -30, W * .4, d.y0 * C - 20, d.y1 * C + 20, 900);
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur), f = from + (to - from) * (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        for (let y = Math.max(1, d.y0 - 2); y <= Math.min(ch - 2, d.y1 + 2); y++) for (let x = Math.max(1, prev | 0); x <= Math.min(cw - 2, f | 0); x++) HD[y * cw + x] = 0;
        if (u < .9) gust(3, f * C - 30, f * C + 10, d.y0 * C, d.y1 * C, 800); /* песок срывается с фронта */
        shade(prev - 2, d.y0 - 2, f + 2, d.y1 + 2); prev = f;
        if (u < 1) requestAnimationFrame(step); else { drawn = null; erasing = false; box.classList.remove("drawn"); }
      };
      requestAnimationFrame(step);
    }
    function init() {
      if (ready || !ctx || !wctx || !window.Float32Array) return;
      ready = true; size();
      field.addEventListener("pointerdown", (e) => {
        if (erasing) return;
        drawing = true; clearTimeout(idle); [px, py] = at(e); stamp(px, py, px, py);
        try { field.setPointerCapture(e.pointerId); } catch (err) { /* старые браузеры */ }
        box.classList.add("drawn");
        if (!sraf) sraf = requestAnimationFrame(flush);
      });
      field.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const [x, y] = at(e);
        if (Math.hypot(x - px, y - py) < .6) return;
        stamp(px, py, x, y);
        if (Math.random() < .5) gust(1, x * C, x * C + 2, y * C - 4, y * C + 4, 120 + Math.random() * 160); /* песчинки из-под пальца */
        px = x; py = y;
        if (!sraf) sraf = requestAnimationFrame(flush);
      });
      const up = () => { if (!drawing) return; drawing = false; clearTimeout(idle); idle = setTimeout(erase, 2600); };
      field.addEventListener("pointerup", up); field.addEventListener("pointercancel", up); field.addEventListener("lostpointercapture", up);
      let lw = box.clientWidth;
      addEventListener("resize", () => { if (Math.abs(box.clientWidth - lw) > 2) { lw = box.clientWidth; size(); } });
    }
    /* фото песка и холст — только когда блок рядом с экраном */
    const load = () => {
      const bg = url("404/sand-" + (innerHeight > innerWidth * 1.2 ? "v" : "h") + ".jpg");
      const pre = new Image();
      pre.onload = pre.onerror = () => { box.style.backgroundImage = 'url("' + bg + '")'; init(); };
      pre.src = bg;
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "600px 0px" });
      io.observe(sec);
    } else load();
  })();
})();
