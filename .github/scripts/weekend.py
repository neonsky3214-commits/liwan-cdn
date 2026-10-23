"""Блок Weekend на сайте Liwan: забирает свежие афиши из публичного канала t.me/loungeliwan.

Какие посты попадают на сайт:
  1) с хештегом #weekend (или #афиша) — всегда, если им не больше WINDOW_DAYS дней;
  2) если таких нет — посты с фото, где в тексте есть слова про DJ, музыку, кинопоказ и т.п.
Результат: weekend/weekend.json + картинки weekend/<id>.jpg (отдаются через GitHub Pages).
Запускается GitHub Actions по расписанию (.github/workflows/weekend.yml). Без зависимостей.
"""
import datetime as dt, html, json, os, re, urllib.request

CHANNEL = "loungeliwan"
WINDOW_DAYS = 10
MAX_ITEMS = 4
TAGS = re.compile(r"#(weekend|викенд|уикенд|афиша)\b", re.I)
EVENT = re.compile(r"\bDJ\b|диджей|ди-джей|\bсет\b|сеты|кинопоказ|\bкино\b|на экране|концерт|живая музыка|живой звук|музыкальн|вечеринк|выступлен|начало в \d|\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}", re.I)
MONTHS = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "weekend")
UA = {"User-Agent": "Mozilla/5.0 (compatible; liwan-weekend/1.0)"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()


def posts(page_html):
    for block in re.split(r'(?=<div class="tgme_widget_message_wrap)', page_html)[1:]:
        pid = re.search(r'data-post="%s/(\d+)"' % CHANNEL, block)
        when = re.search(r'<time datetime="([^"]+)"', block)
        if not pid or not when:
            continue
        txt = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.S)
        raw = txt.group(1) if txt else ""
        text = html.unescape(re.sub(r"<br\s*/?>", "\n", raw))
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"[ \t ]+", " ", text).strip()
        imgs = re.findall(r"tgme_widget_message_(?:photo_wrap|video_thumb)[^>]*background-image:url\('([^']+)'\)", block)
        yield dict(id=int(pid.group(1)), date=when.group(1), text=text, imgs=imgs)


def event_dates(text, posted):
    """даты событий из текста: «21.10», «24 октября»; год — ближайший к дате поста"""
    out = []
    for d, m in re.findall(r"\b(\d{1,2})\.(\d{2})\b(?!\.\d)", text):
        out.append((int(d), int(m)))
    for d, w in re.findall(r"\b(\d{1,2})\s+([а-яё]+)", text.lower()):
        for i, stem in enumerate(MONTHS):
            if w.startswith(stem) and (stem != "ма" or w in ("мая", "май")):
                out.append((int(d), i + 1))
    res = []
    for d, m in out:
        try:
            x = dt.date(posted.year, m, d)
            if (x - posted).days < -200: x = x.replace(year=posted.year + 1)
            res.append(x)
        except ValueError:
            pass
    return res


DATE_RX = re.compile(r"\b(\d{1,2})\.(\d{2})\b(?!\.\d)|\b(\d{1,2})\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-яё]*", re.I)
TIME_RX = re.compile(r"(\d{1,2}:\d{2})(?:\s*[-–—]\s*(\d{1,2}:\d{2}))?")
NOISE = re.compile(r"(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|\b(пн|вт|ср|чт|пт|сб|вс)\b|начало в|начало|бронь.*|по ссылке)", re.I)


def clean(t):
    t = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200d]", "", t)
    return re.sub(r"\s+", " ", t).strip(" ,.|—–-:")


def name_in(text):
    """имя артиста или название: «в кавычках», DJ Имя, слово капсом"""
    q = re.search(r"«([^»]{2,40})»", text)
    if q: return "«" + q.group(1).strip() + "»"
    dj = re.search(r"\bDJ[ \t]+([A-ZА-ЯЁ][\w.\-]+(?:[ \t]+[A-ZА-ЯЁ]{2,}[\w.\-]*)?)", text)
    if dj: return "DJ " + dj.group(1)
    caps = [w for w in re.findall(r"\b[A-ZА-ЯЁ][A-ZА-ЯЁ0-9.\-]{3,}(?:[ \t]+[A-ZА-ЯЁ][A-ZА-ЯЁ0-9.\-]{2,})?\b", text) if w not in ("LIWAN", "DJ")]
    return caps[0] if caps else ""


def kind_of(text):
    t = text.lower()
    if "🎧" in text: return "DJ-сет"
    if "кино" in t or "на экране" in t: return "Кинопоказ"
    if re.search(r"\bdj\b|диджей|\bсет", t): return "DJ-сет"
    if "живая музыка" in t or "живой звук" in t or "концерт" in t: return "Живая музыка"
    if "звучит" in t or "музык" in t: return "Музыкальный вечер"
    return "Вечер в Liwan"


def events_in(post, posted):
    """события поста: строка с датой + следующие строки до новой даты; одна дата — одно событие"""
    lines = post["text"].split("\n")
    idx = [i for i, l in enumerate(lines) if DATE_RX.search(l)]
    post_kind = kind_of(re.sub(r"(?i)кинопоказ|кино|на экране", "", post["text"]))  # для строк без своих слов; кино — только по своей строке
    by_date = {}
    for k, i in enumerate(idx):
        ds = event_dates(lines[i], posted)
        if not ds: continue
        block = "\n".join(lines[i: (idx[k + 1] if k + 1 < len(idx) else min(len(lines), i + 4))])
        tm = TIME_RX.search(block)
        head = TIME_RX.sub(" ", NOISE.sub(" ", DATE_RX.sub(" ", "\n".join(block.split("\n")[:3]))))
        name = name_in(head)
        if not name:
            first = clean(head.split("\n")[0])
            name = first if 2 < len(first) <= 32 else name_in(post["text"])
        kind = kind_of(block)
        if kind == "Вечер в Liwan": kind = post_kind
        e = dict(date=ds[0], time=(tm.group(1) + ("–" + tm.group(2) if tm.group(2) else "")) if tm else None, name=clean(name), kind=kind)
        old = by_date.get(ds[0])
        if not old or (e["time"] and not old["time"]) or (not old["name"] and e["name"]):
            if old and not e["name"]: e["name"] = old["name"]
            by_date[ds[0]] = e
    return list(by_date.values())


def title_of(text):
    text = TAGS.sub("", text)
    lines = [l.strip(" .—-") for l in text.split("\n") if len(l.strip()) > 2]
    t = lines[0] if lines else "Афиша Liwan"
    t = re.sub(r"[\U0001F000-\U0001FAFF☀-➿️]", "", t).strip()
    return (t[:90] + "…") if len(t) > 92 else t


def main():
    now = dt.datetime.now(dt.timezone.utc)
    found = {}
    for url in (f"https://t.me/s/{CHANNEL}", f"https://t.me/s/{CHANNEL}?q=%23weekend", f"https://t.me/s/{CHANNEL}?q=%23%D0%B0%D1%84%D0%B8%D1%88%D0%B0"):
        try:
            for p in posts(get(url).decode("utf-8", "replace")):
                found[p["id"]] = p
        except Exception as err:  # канал недоступен — оставляем прошлый weekend.json
            print("не удалось прочитать", url, err)
    if not found:
        return
    today = (now + dt.timedelta(hours=3)).date()  # Москва
    fresh = []
    for p in found.values():
        posted = dt.datetime.fromisoformat(p["date"])
        if not p["imgs"] or (now - posted).days >= WINDOW_DAYS:
            continue
        p["when"] = sorted(event_dates(p["text"], posted.date()))
        if p["when"] and max(p["when"]) < today:  # событие уже прошло
            continue
        fresh.append(p)
    tagged = [p for p in fresh if TAGS.search(p["text"])]
    pick = tagged or [p for p in fresh if EVENT.search(p["text"])]
    pick = sorted(pick, key=lambda p: p["id"], reverse=True)[:MAX_ITEMS]

    os.makedirs(OUT, exist_ok=True)
    keep, items = set(), []
    for p in pick:
        name = f"{p['id']}.jpg"
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            try:
                open(path, "wb").write(get(p["imgs"][0]))
            except Exception as err:
                print("картинка не скачалась", p["id"], err)
                continue
        keep.add(name)
        upcoming = sorted({d for d in p["when"] if d >= today})
        items.append(dict(id=p["id"], url=f"https://t.me/{CHANNEL}/{p['id']}", date=p["date"][:10],
                          when=[d.isoformat() for d in upcoming],
                          title=title_of(p["text"]), img=name))
    for f in os.listdir(OUT):  # старые картинки убираем
        if f.endswith(".jpg") and f not in keep:
            os.remove(os.path.join(OUT, f))
    # отдельные события (для главной афиши блока): дата, время, кто/что; из нескольких постов про одно событие — более узкий
    ev = {}
    for p in pick:
        posted = dt.datetime.fromisoformat(p["date"]).date()
        es = events_in(p, posted)
        for e in es:
            if e["date"] < today: continue
            key = (e["date"], e["name"].lower())
            cand = dict(date=e["date"].isoformat(), time=e["time"], name=e["name"] or "Вечер в Liwan", kind=e["kind"],
                        url=f"https://t.me/{CHANNEL}/{p['id']}", img=f"{p['id']}.jpg", _n=len(es))
            if key not in ev or cand["_n"] < ev[key]["_n"]: ev[key] = cand
    events = sorted(ev.values(), key=lambda e: (e["date"], e["time"] or ""))[:6]
    for e in events: e.pop("_n")
    data = dict(channel=f"https://t.me/{CHANNEL}", mode="tag" if tagged else "auto", events=events, items=items)
    path = os.path.join(OUT, "weekend.json")
    old = open(path).read() if os.path.exists(path) else ""
    new = json.dumps(data, ensure_ascii=False, indent=1)
    if new != old:
        open(path, "w").write(new)
    print(f"{len(items)} афиш ({data['mode']}):", [i["title"] for i in items])
    print("события:", [(e["date"], e["time"], e["name"], e["kind"]) for e in events])


if __name__ == "__main__":
    main()
