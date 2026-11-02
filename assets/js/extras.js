/* Liwan — дополнения к блоку Tilda: «Карта путника» и «Напомнить» в афише.
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
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches; /* компьютер с мышью */
  const mskToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); /* дата по Москве */
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* приватный режим — без памяти */ } } };

  const css = `
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

@media (max-width: 767px) {
  #liwan .tc { margin: 0; }
  #liwan .tc-in { grid-template-columns: 1fr; gap: 64px; min-height: 0; padding: 72px 20px 96px; }
  #liwan .tc-deck { order: 2; }
}
`;
  const style = document.createElement("style");
  style.textContent = css;
  LW.appendChild(style);

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

})();
