// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: calendar-alt;

// Calendar Alert: your day at a glance.
// Home-screen widget (small / medium / large), lock-screen widget,
// a morning briefing and a heads-up before every meeting.
// Reads every calendar that is visible in the iPhone Calendar app.

// ─── Settings ────────────────────────────────────────────────────────────────
const CONFIG = {
  language: "en",            // "en" or "nl"
  briefingTime: "07:30",     // morning briefing (24h). "" turns it off
  headsUpMinutes: 10,        // notification N minutes before a meeting. 0 turns it off
  excludeCalendars: [],      // calendar names to ignore, e.g. ["Birthdays", "Holidays"]
  hideDeclined: true,        // hide meetings you declined
  showAllDay: true,          // show all-day items in the medium/large widget
  minGapMinutes: 30,         // show "free" blocks of at least this many minutes
  showTomorrowWhenDone: true // after the last meeting, the widget shows tomorrow
}

// ─── Texts ───────────────────────────────────────────────────────────────────
const TEXTS = {
  en: {
    today: "Today", tomorrow: "Tomorrow", next: "NEXT", now: "NOW", in: "in",
    ends: "ends", freeUntil: "Free until", allDay: "All day",
    noMore: "No more meetings", nothing: "Nothing planned", left: "left",
    more: n => `+${n} more`,
    meetings: n => (n === 1 ? "1 meeting" : `${n} meetings`),
    briefingTitle: (day, n) => `${day}: ${n === 0 ? "no meetings" : TEXTS.en.meetings(n)}`,
    first: "First", doneAt: "done at", booked: "booked", longestFree: "free",
    emptyBriefing: "Nothing on the calendar. Enjoy the day.",
    headsUp: (m, title) => `In ${m} min: ${title}`,
    join: "Join", open: "Open in Calendar",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    scheduled: n => `${n} notification${n === 1 ? "" : "s"} scheduled.`,
    preview: "Preview", close: "Close", small: "Small widget", medium: "Medium widget",
    large: "Large widget", lock: "Lock-screen widget"
  },
  nl: {
    today: "Vandaag", tomorrow: "Morgen", next: "HIERNA", now: "NU", in: "over",
    ends: "tot", freeUntil: "Vrij tot", allDay: "Hele dag",
    noMore: "Geen afspraken meer", nothing: "Niets gepland", left: "nog",
    more: n => `+${n} meer`,
    meetings: n => (n === 1 ? "1 afspraak" : `${n} afspraken`),
    briefingTitle: (day, n) => `${day}: ${n === 0 ? "geen afspraken" : TEXTS.nl.meetings(n)}`,
    first: "Eerste", doneAt: "klaar om", booked: "gepland", longestFree: "vrij",
    emptyBriefing: "Niets in de agenda. Geniet van je dag.",
    headsUp: (m, title) => `Over ${m} min: ${title}`,
    join: "Deelnemen", open: "Open in Agenda",
    weekdays: ["zo", "ma", "di", "wo", "do", "vr", "za"],
    months: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
    scheduled: n => `${n} melding${n === 1 ? "" : "en"} ingepland.`,
    preview: "Voorbeeld", close: "Sluiten", small: "Kleine widget", medium: "Middelgrote widget",
    large: "Grote widget", lock: "Toegangsscherm-widget"
  }
}
const T = TEXTS[CONFIG.language] || TEXTS.en

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
  text: Color.dynamic(new Color("#1C1C1E"), new Color("#FFFFFF")),
  sub: Color.dynamic(new Color("#6E6E73"), new Color("#98989D")),
  faint: Color.dynamic(new Color("#AEAEB2"), new Color("#636366")),
  nowRow: Color.dynamic(new Color("#34C759", 0.14), new Color("#30D158", 0.22)),
  now: Color.dynamic(new Color("#248A3D"), new Color("#30D158")),
  soon: Color.dynamic(new Color("#C93400"), new Color("#FF9F0A")),
  urgent: Color.dynamic(new Color("#D70015"), new Color("#FF453A")),
  accent: Color.dynamic(new Color("#0040DD"), new Color("#409CFF"))
}

const MIN = 60 * 1000

// ─── Date helpers ────────────────────────────────────────────────────────────
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function pad(n) {
  return String(n).padStart(2, "0")
}

function hhmm(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dayLabel(d) {
  return `${T.weekdays[d.getDay()]} ${d.getDate()} ${T.months[d.getMonth()]}`
}

function duration(ms) {
  const total = Math.round(ms / MIN)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${pad(m)}`
}

// Opens the Calendar app at the given date.
function calendarURL(d) {
  return `calshow:${Math.floor(d.getTime() / 1000 - 978307200)}`
}

// ─── Calendar data ───────────────────────────────────────────────────────────
function isDeclined(e) {
  const me = (e.attendees || []).find(a => a.isCurrentUser)
  return !!me && me.status === "declined"
}

async function loadEvents(from, to) {
  const events = await CalendarEvent.between(from, to, [])
  return events
    .filter(e => !CONFIG.excludeCalendars.includes(e.calendar.title))
    .filter(e => !(CONFIG.hideDeclined && isDeclined(e)))
    .sort((a, b) => a.startDate - b.startDate)
}

function eventsOnDay(events, day) {
  const from = startOfDay(day)
  const to = addDays(from, 1)
  const inDay = events.filter(e => e.endDate > from && e.startDate < to)
  return {
    date: from,
    allDay: inDay.filter(e => e.isAllDay),
    timed: inDay.filter(e => !e.isAllDay)
  }
}

const JOIN_RE = /https?:\/\/(?:[\w-]+\.)*(?:teams\.microsoft\.com\/l\/meetup-join|teams\.live\.com\/meet|zoom\.us\/(?:j|my|w)\/|meet\.google\.com\/|webex\.com\/)[^\s<>"')\]]*/i

function joinLink(e) {
  for (const s of [e.location, e.notes]) {
    const m = s && s.match(JOIN_RE)
    if (m) return m[0]
  }
  return null
}

function platform(link) {
  if (/teams/i.test(link)) return "Teams"
  if (/zoom/i.test(link)) return "Zoom"
  if (/meet\.google/i.test(link)) return "Google Meet"
  if (/webex/i.test(link)) return "Webex"
  return "Online"
}

// Short, readable location: a room/address, or the video platform name.
function place(e) {
  const loc = (e.location || "").trim()
  const link = joinLink(e)
  const isOnline = /https?:\/\/|teams|zoom|google meet|webex|online/i.test(loc)
  if (link && (!loc || isOnline)) return platform(link)
  return loc ? loc.split("\n")[0] : null
}

// Rows for the list widgets: meetings, with free blocks between them.
function buildRows(items, now, showLeadingGap) {
  const rows = []
  let cursor = showLeadingGap ? now : null
  for (const e of items) {
    if (cursor && e.startDate - cursor >= CONFIG.minGapMinutes * MIN) {
      rows.push({ gap: true, start: cursor, end: e.startDate })
    }
    rows.push({ event: e })
    if (!cursor || e.endDate > cursor) cursor = e.endDate
  }
  return rows
}

// What the widget should show right now: the rest of today, or tomorrow.
async function getView(now) {
  const today = startOfDay(now)
  const events = await loadEvents(today, addDays(today, 2))
  const day = eventsOnDay(events, today)
  const upcoming = day.timed.filter(e => e.endDate > now)
  if (upcoming.length === 0 && CONFIG.showTomorrowWhenDone) {
    const tomorrow = eventsOnDay(events, addDays(today, 1))
    return { title: T.tomorrow, day: tomorrow, items: tomorrow.timed, isTomorrow: true }
  }
  return { title: T.today, day, items: upcoming, isTomorrow: false }
}

function isNow(e, now) {
  return e.startDate <= now && e.endDate > now
}

function urgencyColor(e, now) {
  if (isNow(e, now)) return C.now
  const mins = (e.startDate - now) / MIN
  if (mins <= 5) return C.urgent
  if (mins <= 15) return C.soon
  return C.accent
}

// Next moment the widget's look changes (colors, labels, countdown style).
function nextRefresh(items, now) {
  const moments = [startOfDay(addDays(now, 1))]
  for (const e of items.slice(0, 2)) {
    for (const offset of [60, 15, 5, 0]) moments.push(new Date(e.startDate - offset * MIN))
    moments.push(e.endDate)
  }
  const future = moments.filter(d => d > now).sort((a, b) => a - b)
  return future[0] || new Date(now.getTime() + 15 * MIN)
}

// ─── Widget building blocks ──────────────────────────────────────────────────
function addText(stack, str, font, color, lines = 1) {
  const t = stack.addText(str)
  t.font = font
  t.textColor = color
  t.lineLimit = lines
  return t
}

// "in 25:10" (live timer under an hour), "in 2 hr, 15 min" otherwise,
// or "ends 11:30" while the meeting is running.
function addCountdown(stack, e, now, size, color) {
  const row = stack.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  const font = Font.semiboldSystemFont(size)
  if (isNow(e, now)) {
    addText(row, `${T.now} · ${T.ends} ${hhmm(e.endDate)}`, font, color)
    return row
  }
  addText(row, `${T.in} `, font, color)
  const d = row.addDate(e.startDate)
  if (e.startDate - now < 60 * MIN) d.applyTimerStyle()
  else d.applyRelativeStyle()
  d.font = font
  d.textColor = color
  d.lineLimit = 1
  return row
}

function addBar(stack, color, height) {
  const bar = stack.addStack()
  bar.size = new Size(4, height)
  bar.cornerRadius = 2
  bar.backgroundColor = color
}

function addHeader(w, view, now, right) {
  const h = w.addStack()
  h.layoutHorizontally()
  h.centerAlignContent()
  addText(h, view.title.toUpperCase(), Font.boldSystemFont(12), C.accent)
  addText(h, `  ${dayLabel(view.day.date)}`, Font.mediumSystemFont(12), C.sub)
  h.addSpacer()
  if (right) addText(h, right, Font.mediumSystemFont(12), C.sub)
}

function addEmpty(w, view) {
  w.addSpacer()
  addText(w, view.isTomorrow ? T.nothing : T.noMore, Font.semiboldSystemFont(15), C.sub)
  w.addSpacer()
}

function addAllDay(w, view) {
  if (!CONFIG.showAllDay || view.day.allDay.length === 0) return
  w.addSpacer(4)
  const names = view.day.allDay.map(e => e.title).join(" · ")
  addText(w, `${T.allDay}: ${names}`, Font.mediumSystemFont(11), C.sub)
}

function addEventRow(w, e, now, opts) {
  const row = w.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.setPadding(3, 4, 3, 6)
  row.cornerRadius = 6
  if (isNow(e, now)) row.backgroundColor = C.nowRow
  const link = joinLink(e)
  row.url = link || calendarURL(e.startDate)

  addBar(row, e.calendar.color, opts.twoLines ? 28 : 16)
  row.addSpacer(6)

  const timeBox = row.addStack()
  timeBox.size = new Size(42, 0)
  addText(timeBox, hhmm(e.startDate), Font.semiboldSystemFont(13), C.text)
  timeBox.addSpacer()
  row.addSpacer(4)

  const textCol = row.addStack()
  textCol.layoutVertically()
  addText(textCol, e.title, Font.semiboldSystemFont(13), C.text)
  if (opts.twoLines) {
    const p = place(e)
    const detail = `${hhmm(e.startDate)}–${hhmm(e.endDate)}${p ? " · " + p : ""}`
    addText(textCol, detail, Font.systemFont(11), C.sub)
  }
  row.addSpacer()

  if (opts.countdown) {
    row.addSpacer(4)
    const color = urgencyColor(e, now)
    if (isNow(e, now)) addText(row, T.now, Font.boldSystemFont(12), color)
    else addCountdown(row, e, now, 12, color)
  }
}

function addGapRow(w, gap) {
  const row = w.addStack()
  row.layoutHorizontally()
  row.setPadding(1, 14, 1, 6)
  addText(row, `${T.freeUntil} ${hhmm(gap.end)} · ${duration(gap.end - gap.start)}`,
    Font.italicSystemFont(11), C.faint)
}

// ─── Widgets ─────────────────────────────────────────────────────────────────
function newWidget(view, now) {
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.refreshAfterDate = nextRefresh(view.items, now)
  w.url = calendarURL(view.items[0] ? view.items[0].startDate : view.day.date)
  return w
}

// Small: the next (or current) meeting, big and clear.
function smallWidget(view, now) {
  const w = newWidget(view, now)
  w.setPadding(14, 14, 14, 14)
  addText(w, `${view.title.toUpperCase()} · ${T.weekdays[view.day.date.getDay()]} ${view.day.date.getDate()}`,
    Font.boldSystemFont(11), C.sub)

  const e = view.items[0]
  if (!e) {
    addEmpty(w, view)
    return w
  }

  w.addSpacer(6)
  if (view.isTomorrow) addText(w, T.first.toUpperCase(), Font.semiboldSystemFont(13), C.accent)
  else addCountdown(w, e, now, 13, urgencyColor(e, now))
  w.addSpacer(4)
  const title = addText(w, e.title, Font.boldSystemFont(16), C.text, 3)
  title.minimumScaleFactor = 0.75
  w.addSpacer(4)
  addText(w, `${hhmm(e.startDate)}–${hhmm(e.endDate)}`, Font.mediumSystemFont(13), C.sub)
  const p = place(e)
  if (p) addText(w, p, Font.systemFont(12), C.sub)
  w.addSpacer()

  const rest = view.items.length - 1
  if (rest > 0) {
    const nxt = view.items[1]
    addText(w, `${hhmm(nxt.startDate)} ${nxt.title}`, Font.mediumSystemFont(11), C.sub)
  }

  // Tap to join when the meeting is about to start or running.
  const link = joinLink(e)
  if (link && e.startDate - now <= 15 * MIN) w.url = link
  return w
}

// Medium / large: the rest of the day as a timeline with free blocks.
function listWidget(view, now, large) {
  const w = newWidget(view, now)
  w.setPadding(12, 12, 12, 12)
  const right = view.items.length ? `${view.items.length} ${T.left}` : null
  addHeader(w, view, now, view.isTomorrow ? T.meetings(view.items.length) : right)
  if (large) addAllDay(w, view)

  if (view.items.length === 0) {
    addEmpty(w, view)
    return w
  }

  w.addSpacer(6)
  const rows = buildRows(view.items, now, large && !view.isTomorrow)
  const maxRows = large ? 9 : 4
  let shown = 0
  let shownEvents = 0
  for (const r of rows) {
    if (shown >= maxRows) break
    // never end on a free-block row
    if (r.gap && shown === maxRows - 1) break
    if (r.gap) addGapRow(w, r)
    else {
      addEventRow(w, r.event, now, { twoLines: large, countdown: shownEvents === 0 && !view.isTomorrow })
      shownEvents++
    }
    shown++
    w.addSpacer(large ? 3 : 2)
  }
  const hidden = view.items.length - shownEvents
  w.addSpacer()
  if (hidden > 0) addText(w, T.more(hidden), Font.mediumSystemFont(11), C.sub)
  return w
}

// Lock screen: rectangular, inline and circular.
function accessoryWidget(view, now, family) {
  const w = new ListWidget()
  w.refreshAfterDate = nextRefresh(view.items, now)
  const e = view.items[0]
  w.url = calendarURL(e ? e.startDate : view.day.date)
  const white = Color.white()

  if (family === "accessoryInline") {
    addText(w, e ? `${hhmm(e.startDate)} ${e.title}` : (view.isTomorrow ? T.nothing : T.noMore),
      Font.systemFont(12), white)
    return w
  }

  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true
    const s = w.addStack()
    s.layoutVertically()
    s.centerAlignContent()
    addText(s, e && isNow(e, now) ? T.now : T.next, Font.boldSystemFont(9), white)
    addText(s, e ? hhmm(e.startDate) : "–", Font.boldSystemFont(14), white)
    return w
  }

  // accessoryRectangular
  if (!e) {
    addText(w, view.isTomorrow ? `${T.tomorrow}: ${T.nothing}` : T.noMore, Font.semiboldSystemFont(14), white, 2)
    return w
  }
  const top = w.addStack()
  top.layoutHorizontally()
  if (view.isTomorrow) {
    addText(top, `${T.tomorrow} ${hhmm(e.startDate)}`, Font.semiboldSystemFont(13), white)
  } else {
    addText(top, `${hhmm(e.startDate)} · `, Font.semiboldSystemFont(13), white)
    addCountdown(top, e, now, 13, white)
  }
  addText(w, e.title, Font.boldSystemFont(14), white)
  const p = place(e)
  const rest = view.items.length - 1
  const last = [p, rest > 0 ? T.more(rest) : null].filter(Boolean).join(" · ")
  if (last) addText(w, last, Font.systemFont(12), white)
  return w
}

async function buildWidget(family, now) {
  const view = await getView(now)
  if (family && family.startsWith("accessory")) return accessoryWidget(view, now, family)
  if (family === "small") return smallWidget(view, now)
  return listWidget(view, now, family === "large" || family === "extraLarge")
}

// ─── Notifications ───────────────────────────────────────────────────────────
const NOTIFY_PREFIX = "calendar-alert."

function briefingFor(day, label) {
  const n = day.timed.length
  const lines = []
  if (n === 0) {
    lines.push(T.emptyBriefing)
  } else {
    const first = day.timed[0]
    const lastEnd = new Date(Math.max(...day.timed.map(e => e.endDate.getTime())))
    lines.push(`${T.first} ${hhmm(first.startDate)} ${first.title} · ${T.doneAt} ${hhmm(lastEnd)}`)

    let booked = 0
    let cursor = null
    let longest = null
    for (const e of day.timed) {
      const start = cursor && e.startDate < cursor ? cursor : e.startDate
      if (e.endDate > start) booked += e.endDate - start
      if (cursor && e.startDate - cursor > 0 && (!longest || e.startDate - cursor > longest.end - longest.start)) {
        longest = { start: cursor, end: e.startDate }
      }
      if (!cursor || e.endDate > cursor) cursor = e.endDate
    }
    let summary = `${duration(booked)} ${T.booked}`
    if (longest && longest.end - longest.start >= CONFIG.minGapMinutes * MIN) {
      summary += ` · ${T.longestFree} ${hhmm(longest.start)}–${hhmm(longest.end)}`
    }
    lines.push(summary)
  }
  if (day.allDay.length) lines.push(`${T.allDay}: ${day.allDay.map(e => e.title).join(", ")}`)
  return { title: T.briefingTitle(label, n), body: lines.join("\n") }
}

// Plans the notifications for today and tomorrow. Safe to run often:
// it replaces whatever this script scheduled before.
async function scheduleNotifications(now) {
  const today = startOfDay(now)
  const events = await loadEvents(today, addDays(today, 2))
  const planned = []

  if (CONFIG.headsUpMinutes > 0) {
    for (const e of events) {
      if (e.isAllDay) continue
      const at = new Date(e.startDate - CONFIG.headsUpMinutes * MIN)
      if (at <= now) continue
      const n = new Notification()
      n.identifier = `${NOTIFY_PREFIX}headsup.${e.identifier}.${e.startDate.getTime()}`
      n.threadIdentifier = "calendar-alert-headsup"
      n.title = T.headsUp(CONFIG.headsUpMinutes, e.title)
      const p = place(e)
      n.body = `${hhmm(e.startDate)}–${hhmm(e.endDate)}${p ? " · " + p : ""}`
      n.sound = "event"
      const link = joinLink(e)
      n.openURL = link || calendarURL(e.startDate)
      if (link) n.addAction(T.join, link)
      n.addAction(T.open, calendarURL(e.startDate))
      n.setTriggerDate(at)
      planned.push(n)
    }
  }

  const m = CONFIG.briefingTime.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    for (const offset of [0, 1]) {
      const day = addDays(today, offset)
      const at = new Date(day)
      at.setHours(Number(m[1]), Number(m[2]), 0, 0)
      if (at <= now) continue
      const { title, body } = briefingFor(eventsOnDay(events, day), T.today)
      const n = new Notification()
      n.identifier = `${NOTIFY_PREFIX}briefing.${day.getTime()}`
      n.threadIdentifier = "calendar-alert-briefing"
      n.title = title
      n.body = body
      n.sound = "default"
      n.openURL = calendarURL(at)
      n.setTriggerDate(at)
      planned.push(n)
    }
  }

  const pending = await Notification.allPending()
  const ours = pending.map(n => n.identifier).filter(id => id && id.startsWith(NOTIFY_PREFIX))
  if (ours.length) await Notification.removePending(ours)
  for (const n of planned) await n.schedule()
  return planned.length
}

// ─── Run ─────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date()

  if (config.runsInWidget) {
    Script.setWidget(await buildWidget(config.widgetFamily, now))
    try {
      await scheduleNotifications(now)
    } catch (err) {
      console.error(err)
    }
    return
  }

  const count = await scheduleNotifications(now)
  if (!config.runsInApp) return // e.g. run from a Shortcuts automation

  const a = new Alert()
  a.title = "Calendar Alert"
  a.message = T.scheduled(count)
  const options = [
    [T.small, "small", w => w.presentSmall()],
    [T.medium, "medium", w => w.presentMedium()],
    [T.large, "large", w => w.presentLarge()],
    [T.lock, "accessoryRectangular", w => w.presentAccessoryRectangular ? w.presentAccessoryRectangular() : w.presentSmall()]
  ]
  for (const [label] of options) a.addAction(`${T.preview}: ${label}`)
  a.addCancelAction(T.close)
  const choice = await a.presentSheet()
  if (choice >= 0 && choice < options.length) {
    const [, family, present] = options[choice]
    await present(await buildWidget(family, now))
  }
}

await main()
Script.complete()
