/**
 * Trip day navigation helpers — timezone-aware "today", sticky jumps, hash.
 * Generic: pass days[{id,date}], callbacks; safe to load on any trip page.
 *
 * Date rules (calendar date in opts.timezone, default Asia/Taipei):
 * - within [firstDate..lastDate]: jump to that day (unless URL hash)
 * - before firstDate: stay at overview/top
 * - after lastDate: prefer travelogueHref if set, else overview/top
 * - hash like #d3: honor it; do not force today
 *
 * Testing: ?simDate=YYYY-MM-DD or window.__TRIP_SIM_DATE__
 */
(function (global) {
  "use strict";

  var TZ_DEFAULT = "Asia/Taipei";

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** Calendar YYYY-MM-DD in timezone (or sim override). */
  function calendarDateInTz(timezone, now) {
    var sim =
      (typeof global.__TRIP_SIM_DATE__ === "string" && global.__TRIP_SIM_DATE__) ||
      (function () {
        try {
          var q = new URLSearchParams(global.location.search).get("simDate");
          return q || "";
        } catch (e) {
          return "";
        }
      })();
    if (/^\d{4}-\d{2}-\d{2}$/.test(sim)) return sim;

    var d = now instanceof Date ? now : new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone || TZ_DEFAULT,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);
      var y = "",
        m = "",
        day = "";
      parts.forEach(function (p) {
        if (p.type === "year") y = p.value;
        if (p.type === "month") m = p.value;
        if (p.type === "day") day = p.value;
      });
      if (y && m && day) return y + "-" + m + "-" + day;
    } catch (e) {}
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function parseHashDayId(hash) {
    if (!hash) return null;
    var h = String(hash).replace(/^#/, "").toLowerCase();
    if (/^d\d+$/.test(h)) return h;
    return null;
  }

  /**
   * Build day index map from page data.
   * days: [{ id: "d1", date: "2026-11-23", label?: "D1" }, ...]
   */
  function indexDays(days) {
    var byDate = Object.create(null);
    var byId = Object.create(null);
    var list = Array.isArray(days) ? days : [];
    list.forEach(function (d, i) {
      if (!d) return;
      var id = d.id || "d" + (i + 1);
      var date = d.date;
      byId[id] = i;
      if (date) byDate[date] = i;
    });
    var first = list.length && list[0].date ? list[0].date : null;
    var last = list.length && list[list.length - 1].date ? list[list.length - 1].date : null;
    return { byDate: byDate, byId: byId, first: first, last: last, list: list };
  }

  function phaseForDate(today, first, last) {
    if (!today || !first || !last) return "unknown";
    if (today < first) return "before";
    if (today > last) return "after";
    return "during";
  }

  function scrollToEl(el, behavior) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: behavior || "smooth", block: "start" });
    } catch (e) {
      el.scrollIntoView(true);
    }
  }

  function scrollTop(behavior) {
    try {
      global.scrollTo({ top: 0, behavior: behavior || "smooth" });
    } catch (e) {
      global.scrollTo(0, 0);
    }
  }

  /**
   * opts:
   * - days, timezone
   * - travelogueHref (string|null)
   * - navEl: sticky nav container
   * - onSelectDay(index, day)
   * - getDayEl(id) → element
   * - markToday(index|null) → optional UI hook
   * - autoJump (default true)
   * - now (Date, optional)
   */
  function init(opts) {
    opts = opts || {};
    var tz = opts.timezone || TZ_DEFAULT;
    var idx = indexDays(opts.days);
    var today = calendarDateInTz(tz, opts.now);
    var phase = phaseForDate(today, idx.first, idx.last);
    var todayIndex = phase === "during" && today in idx.byDate ? idx.byDate[today] : null;
    var hashId = parseHashDayId(global.location && global.location.hash);
    var hashIndex = hashId != null && hashId in idx.byId ? idx.byId[hashId] : null;

    if (typeof opts.markToday === "function") opts.markToday(todayIndex);

    function goDay(i, smooth) {
      if (i == null || i < 0 || i >= idx.list.length) return;
      var day = idx.list[i];
      if (typeof opts.onSelectDay === "function") opts.onSelectDay(i, day);
      var el =
        typeof opts.getDayEl === "function"
          ? opts.getDayEl(day.id || "d" + (i + 1))
          : document.getElementById(day.id || "d" + (i + 1));
      // After layout/tab switch
      setTimeout(function () {
        scrollToEl(el || document.getElementById("dayContent") || document.getElementById("plan"), smooth === false ? "auto" : "smooth");
      }, 40);
    }

    function goOverview(smooth) {
      if (typeof opts.onOverview === "function") opts.onOverview();
      scrollTop(smooth === false ? "auto" : "smooth");
    }

    function goTravelogue() {
      if (opts.travelogueHref) {
        global.location.href = opts.travelogueHref;
      }
    }

    function buildNav() {
      var nav = opts.navEl || document.getElementById("tripDayNav");
      if (!nav) return;
      nav.replaceChildren();
      nav.setAttribute("aria-label", "行程快速導覽");

      function addBtn(text, onClick, extraClass, isLink, href) {
        var node;
        if (isLink && href) {
          node = document.createElement("a");
          node.href = href;
          node.textContent = text;
        } else {
          node = document.createElement("button");
          node.type = "button";
          node.textContent = text;
          node.addEventListener("click", onClick);
        }
        node.className = "trip-day-nav__btn" + (extraClass ? " " + extraClass : "");
        nav.appendChild(node);
        return node;
      }

      if (opts.compactBottomNav) {
        addBtn(
          "今天",
          function () {
            if (todayIndex != null) goDay(todayIndex);
            else goOverview();
          },
          todayIndex != null ? "is-today-ctrl" : "is-muted"
        );
        addBtn(
          "總覽",
          function () {
            goOverview();
          },
          "is-overview"
        );
        if (opts.travelogueHref) {
          addBtn("遊記", null, "is-travelogue", true, opts.travelogueHref);
        } else if (typeof opts.onTraveloguePlaceholder === "function") {
          addBtn(
            "遊記",
            function () {
              opts.onTraveloguePlaceholder();
            },
            "is-travelogue"
          );
        } else {
          addBtn(
            "遊記",
            function () {
              goOverview();
            },
            "is-travelogue is-muted"
          );
        }
        (opts.extraNavButtons || []).forEach(function (b) {
          addBtn(b.text, b.onClick, b.className || "");
        });
        return;
      }

      // After trip: surface 遊記 first when a link exists
      if (phase === "after" && opts.travelogueHref) {
        addBtn("遊記", null, "is-travelogue", true, opts.travelogueHref);
      }

      addBtn("今天", function () {
        if (todayIndex != null) goDay(todayIndex);
        else goOverview();
      }, todayIndex != null ? "is-today-ctrl" : "is-muted");

      addBtn("總覽", function () {
        goOverview();
      }, "is-overview");

      idx.list.forEach(function (d, i) {
        var short = d.shortLabel || d.id || "D" + (i + 1);
        if (/^d\d+$/i.test(short)) short = short.toUpperCase();
        var cls = i === todayIndex ? "is-today-day" : "";
        var label = i === todayIndex ? short + "·今天" : short;
        addBtn(label, function () {
          goDay(i);
          try {
            history.replaceState(null, "", "#" + (d.id || "d" + (i + 1)));
          } catch (e) {}
        }, cls);
      });

      if (phase !== "after" && opts.travelogueHref) {
        addBtn("遊記", null, "is-travelogue", true, opts.travelogueHref);
      }
    }

    buildNav();

    var autoJump = opts.autoJump !== false;
    if (autoJump) {
      if (hashIndex != null) {
        goDay(hashIndex, false);
      } else if (phase === "during" && todayIndex != null) {
        goDay(todayIndex, false);
      } else if (phase === "after" && opts.travelogueHref) {
        setTimeout(function () {
          goTravelogue();
        }, 50);
      } else {
        // before / after-without-travelogue / unknown → overview
        goOverview(false);
      }
    }

    global.addEventListener("hashchange", function () {
      var id = parseHashDayId(global.location.hash);
      if (id != null && id in idx.byId) goDay(idx.byId[id]);
    });

    return {
      today: today,
      phase: phase,
      todayIndex: todayIndex,
      goDay: goDay,
      goOverview: goOverview,
      goTravelogue: goTravelogue,
      calendarDateInTz: calendarDateInTz,
    };
  }

  global.TripDayNav = {
    init: init,
    calendarDateInTz: calendarDateInTz,
    indexDays: indexDays,
    phaseForDate: phaseForDate,
    parseHashDayId: parseHashDayId,
  };
})(typeof window !== "undefined" ? window : globalThis);
