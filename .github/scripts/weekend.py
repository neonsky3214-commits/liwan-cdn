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


def title_of(text):
    text = TAGS.sub("", text)
    lines = [l.strip(" .—-") for l in text.split("\n") if len(l.strip()) > 2]
    t = lines[0] if lines else "Афиша Liwan"
    t = re.sub(r"[\U0001F000-\U0001FAFF☀-➿️]", "", t).strip()
    return (t[:90] + "…") if len(t) > 92 else t


def main():
    now = dt.datetime.now(dt.timezone.utc)
    found = {}
    for url in (f"https://t.me/s/{CHANNEL}", f"https://t.me/s/{CHANNEL}?q=%23weekend", f"https://t.me/s/{CHANNEL}?q=%23афиша"):
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
        upcoming = [d for d in p["when"] if d >= today]
        items.append(dict(id=p["id"], url=f"https://t.me/{CHANNEL}/{p['id']}", date=p["date"][:10],
                          when=[d.isoformat() for d in upcoming],
                          title=title_of(p["text"]), img=name))
    for f in os.listdir(OUT):  # старые картинки убираем
        if f.endswith(".jpg") and f not in keep:
            os.remove(os.path.join(OUT, f))
    data = dict(channel=f"https://t.me/{CHANNEL}", mode="tag" if tagged else "auto", items=items)
    path = os.path.join(OUT, "weekend.json")
    old = open(path).read() if os.path.exists(path) else ""
    new = json.dumps(data, ensure_ascii=False, indent=1)
    if new != old:
        open(path, "w").write(new)
    print(f"{len(items)} афиш ({data['mode']}):", [i["title"] for i in items])


if __name__ == "__main__":
    main()
