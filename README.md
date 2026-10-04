# Calendar Alert

Your day at a glance on the iPhone, built with [Scriptable](https://scriptable.app).
It reads every calendar that shows up in the iPhone Calendar app (Exchange/Outlook,
Google, iCloud), so there is nothing to connect.

**What you get**

| Where | What it shows |
| --- | --- |
| Small widget | The next (or current) meeting: live countdown, title, time, place. Turns orange 15 min before, red 5 min before, green while it's running. Tap to join Teams/Zoom/Meet when it's about to start. |
| Medium widget | The rest of today as a timeline, with free blocks ("Free until 13:00 · 1 h 30"). |
| Large widget | Same, with all-day items, end times and locations. |
| Lock screen | "10:30 · in 40 min / Board meeting / Teams · +3 more" (rectangular), plus inline and circular versions. |
| Notifications | A morning briefing (07:30) and a heads-up 10 minutes before every meeting, with a **Join** button for online meetings. |

After your last meeting of the day, the widgets switch to **tomorrow**.
Declined meetings are hidden.

## Install (5 minutes)

1. **Add the script.** In Scriptable, tap **+**, paste the contents of
   [`CalendarAlert.js`](CalendarAlert.js), and name the script `Calendar Alert`
   (tap the title at the top).
2. **Run it once in the app** (▶︎ bottom right). Allow access to **Calendars** and
   **Notifications**. You'll get a menu to preview each widget.
3. **Home-screen widget.** Long-press the home screen → **Edit** → **Add Widget** →
   Scriptable → choose Small, Medium or Large → tap the widget while editing →
   **Script: Calendar Alert**. Set **When Interacting** to **Run Script** if you want
   taps to open your meeting or join link (the default "Open App" opens Scriptable).
   You can add several sizes.
4. **Lock-screen widget.** Long-press the lock screen → **Customize** → Lock Screen →
   tap the widget area → Scriptable → pick the rectangular one → tap it → Script:
   **Calendar Alert**.
5. **Keep notifications up to date.** The widgets refresh notifications whenever iOS
   refreshes them, but add a daily automation to be safe:
   Shortcuts → **Automation** → **+** → **Time of Day** → 06:00, Daily →
   **Run Immediately** → Next → add the Scriptable action **Run Script** →
   choose `Calendar Alert`. Optionally add a second one at 12:00 to pick up
   changes made during the morning.
6. **Focus modes.** If you use a Work Focus, allow notifications from Scriptable so
   the heads-ups get through.

## Settings

At the top of the script:

```js
const CONFIG = {
  language: "en",            // "en" or "nl"
  briefingTime: "07:30",     // morning briefing (24h). "" turns it off
  headsUpMinutes: 10,        // notification N minutes before a meeting. 0 turns it off
  excludeCalendars: [],      // calendar names to ignore, e.g. ["Birthdays", "Holidays"]
  hideDeclined: true,
  showAllDay: true,
  minGapMinutes: 30,         // show "free" blocks of at least this many minutes
  showTomorrowWhenDone: true
}
```

Change a value and save. The widgets pick it up at their next refresh.

## Good to know

- iOS decides how often widgets refresh (roughly every 5–30 minutes). The countdown
  ticks live regardless; colors and the list catch up at the next refresh.
- Updating: paste the new version of `CalendarAlert.js` over the old one in
  Scriptable. Your `CONFIG` lines are part of the file, so re-apply any changes.

## Development

`node dev/preview.mjs "2026-10-06T10:20"` runs the script against a fake Scriptable
API and sample calendar, and prints what every widget and notification would show at
that moment.
