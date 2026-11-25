/** Update .hero .daymeta from trip date range vs today (Asia/Taipei). */
(function (global) {
  "use strict";

  function apply(opts) {
    opts = opts || {};
    var el = document.querySelector(opts.selector || ".hero .daymeta");
    if (!el || !global.TripDayNav) return;
    var tz = opts.timezone || "Asia/Taipei";
    var today = global.TripDayNav.calendarDateInTz(tz);
    var phase = global.TripDayNav.phaseForDate(today, opts.start, opts.end);
    var status =
      phase === "during"
        ? opts.during || "進行中"
        : phase === "after"
          ? opts.after || "已完成"
          : opts.before || "行前";
    var tail = opts.suffix ? " · " + opts.suffix : "";
    el.textContent = opts.range + " · " + status + tail;
  }

  global.TripHeroStatus = { apply: apply };
})(typeof window !== "undefined" ? window : globalThis);