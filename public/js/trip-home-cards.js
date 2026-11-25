/** Homepage trip cards — badge status from date range (Asia/Taipei). */
(function (global) {
  "use strict";

  function applyCardStatus(root, tz) {
    tz = tz || "Asia/Taipei";
    if (!global.TripDayNav) return;
    var today = global.TripDayNav.calendarDateInTz(tz);
    var scope = root || document;
    scope.querySelectorAll("[data-trip-start][data-trip-end]").forEach(function (card) {
      var start = card.getAttribute("data-trip-start");
      var end = card.getAttribute("data-trip-end");
      var phase = global.TripDayNav.phaseForDate(today, start, end);
      var badge = card.querySelector(".trip-status-badge");
      if (!badge) return;
      var text =
        phase === "during"
          ? card.getAttribute("data-badge-during") || "進行中"
          : phase === "after"
            ? card.getAttribute("data-badge-after") || "已完成"
            : card.getAttribute("data-badge-before") || "行前";
      badge.textContent = text;
    });
  }

  global.TripHomeCards = { applyCardStatus: applyCardStatus };
})(typeof window !== "undefined" ? window : globalThis);