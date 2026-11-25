/** Append spec §3.2 sight guide block (intro / highlights / shots / tips) — separate from history & mosaic. */
(function (global) {
  "use strict";

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function appendSightGuide(parent, place) {
    var g = place && place.guide;
    if (!g) return;
    var box = el("div", "sightguide");
    if (g.intro) box.append(el("p", "why", g.intro));
    if (g.highlights)
      box.append(el("p", "meta", "<b>看點：</b>" + g.highlights));
    if (g.shots && g.shots.length)
      box.append(
        el(
          "p",
          "meta",
          "<b>建議拍照：</b>" +
            g.shots.map(function (s) {
              return "・" + s;
            }).join(" ")
        )
      );
    if (g.tips && g.tips.length)
      box.append(
        el(
          "p",
          "meta",
          "<b>提醒：</b>" +
            g.tips.map(function (t) {
              return "・" + t;
            }).join(" ")
        )
      );
    if (g.pending)
      box.append(el("p", "meta", '<span class="pending">' + g.pending + "</span>"));
    parent.append(box);
  }

  global.SightGuideUI = { appendSightGuide: appendSightGuide };
})(typeof window !== "undefined" ? window : globalThis);