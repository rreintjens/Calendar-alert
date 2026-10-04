// Runs CalendarAlert.js in Node against a fake Scriptable API and prints
// what each widget would show. Usage: node dev/preview.mjs ["2026-10-06T10:20"]
import { readFileSync } from "node:fs"

const NOW = process.argv[2] ? new Date(process.argv[2]) : new Date("2026-10-06T10:20")
const RealDate = Date
class FakeDate extends RealDate {
  constructor(...a) { super(...(a.length ? a : [NOW.getTime()])) }
  static now() { return NOW.getTime() }
}

const at = (day, hm) => {
  const d = new RealDate(NOW); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + day)
  const [h, m] = hm.split(":").map(Number); d.setHours(h, m); return d
}
const cal = (title, color) => ({ title, color: { hex: color } })
const work = cal("Body Clinic", "#0A84FF")
const arhos = cal("ARHOS", "#FF9F0A")
const home = cal("Family", "#30D158")
const ev = (day, s, e, title, calendar, extra = {}) =>
  ({ identifier: title, title, startDate: at(day, s), endDate: at(day, e), isAllDay: false, calendar, attendees: [], ...extra })

const EVENTS = [
  { ...ev(0, "00:00", "23:59", "Minoo sports day", home), isAllDay: true },
  ev(0, "08:30", "09:00", "Daily standup", work),
  ev(0, "10:00", "11:00", "IT roadmap review", work, { location: "Microsoft Teams Meeting", notes: "Join: <https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc/0?context=x>" }),
  ev(0, "10:30", "11:30", "Overlapping call", arhos),
  ev(0, "13:00", "13:30", "MediPhysio weekly", arhos, { location: "Praxis Wien 1\nStephansplatz 1" }),
  ev(0, "15:00", "16:00", "Investor update", work, { location: "https://us02web.zoom.us/j/123456?pwd=abc" }),
  ev(0, "16:00", "16:30", "Declined thing", work, { attendees: [{ isCurrentUser: true, status: "declined" }] }),
  ev(0, "17:30", "18:00", "Call with accountant", arhos),
  ev(1, "09:00", "10:00", "HeimPhysio planning", arhos),
  ev(1, "14:00", "15:00", "Body Clinic board", work),
]

const out = []
let depth = 0
const log = s => out.push("  ".repeat(depth) + s)

class Stack {
  constructor() { this.children = []; this.dir = "v" }
  layoutHorizontally() { this.dir = "h" }
  layoutVertically() { this.dir = "v" }
  centerAlignContent() {}
  setPadding() {}
  addText(s) { const t = { kind: "text", s }; this.children.push(t); return t }
  addDate(d) { const t = { kind: "date", d, style: "date", applyTimerStyle() { this.style = "timer" }, applyRelativeStyle() { this.style = "relative" } }; this.children.push(t); return t }
  addStack() { const s = new Stack(); this.children.push(s); return s }
  addSpacer() {}
  addImage() { return {} }
}
class ListWidget extends Stack {}

function render(node) {
  if (node.kind === "text") return node.s
  if (node.kind === "date") {
    const mins = Math.round((node.d - NOW) / 60000)
    return node.style === "timer" ? `⏱${mins}:00` : `~${Math.floor(mins / 60)} hr, ${mins % 60} min`
  }
  const parts = node.children.map(render).filter(Boolean)
  return node.dir === "h" ? parts.join("") : parts.join("\n")
}

const pending = []
class Notification {
  constructor() { this.actions = [] }
  addAction(t, u) { this.actions.push(t) }
  setTriggerDate(d) { this.trigger = d }
  async schedule() { pending.push(this) }
  static async allPending() { return [...pending] }
  static async removePending(ids) { for (const id of ids) { const i = pending.findIndex(n => n.identifier === id); if (i >= 0) pending.splice(i, 1) } }
}

const Color = class { constructor(hex) { this.hex = hex } static dynamic(l) { return l } static white() { return new Color("#fff") } }
const Font = new Proxy({}, { get: () => () => ({}) })
const config = { runsInWidget: true, runsInApp: false, widgetFamily: "small" }

const src = readFileSync(new URL("../CalendarAlert.js", import.meta.url), "utf8")
  .replace(/^await main\(\)$/m, "return main()")
const run = new Function("Date", "CalendarEvent", "ListWidget", "Notification", "Color", "Font", "Size", "Script", "Alert", "config", "console",
  `return (async () => {${src}})()`)

const env = {
  CalendarEvent: { between: async (from, to) => EVENTS.filter(e => e.endDate > from && e.startDate < to) },
  Size: class { constructor(w, h) { this.w = w; this.h = h } },
  Script: { setWidget: w => { env.widget = w }, complete() {} },
}

console.log(`Now: ${NOW.toString().slice(0, 21)}\n`)
for (const family of ["small", "medium", "large", "accessoryRectangular", "accessoryInline", "accessoryCircular"]) {
  config.widgetFamily = family
  await run(FakeDate, env.CalendarEvent, ListWidget, Notification, Color, Font, env.Size, env.Script, class {}, config, console)
  console.log(`── ${family} (refresh after ${env.widget.refreshAfterDate.toTimeString().slice(0, 5)}) ──`)
  console.log(render(env.widget) + "\n")
}
console.log("── scheduled notifications ──")
for (const n of pending.sort((a, b) => a.trigger - b.trigger)) {
  console.log(`${n.trigger.toString().slice(0, 21)}  ${n.title}\n    ${n.body.replace(/\n/g, "\n    ")}${n.actions.length ? `\n    [${n.actions.join("] [")}]` : ""}`)
}
