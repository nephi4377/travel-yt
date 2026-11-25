/** Append spec §3.2 sight guide block (intro / highlights / shots [/ tips]) — separate from history & mosaic. */
(function (global) {
  "use strict";

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /**
   * @param {HTMLElement} parent
   * @param {object} place  with .guide
   * @param {object} [opts]  opts.tips === false → skip tips (use TripPlaceCard walk tips instead)
   */
  function appendSightGuide(parent, place, opts) {
    var g = place && place.guide;
    if (!g) return;
    opts = opts || {};
    var showTips = opts.tips !== false;
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
            g.shots
              .map(function (s) {
                return "・" + s;
              })
              .join(" ")
        )
      );
    if (showTips && g.tips && g.tips.length)
      box.append(
        el(
          "p",
          "meta",
          "<b>提醒：</b>" +
            g.tips
              .map(function (t) {
                return "・" + t;
              })
              .join(" ")
        )
      );
    /* Do not invent 「待確認」 placeholders for missing photos/shots (豪哥 2026-11-25). */
    parent.append(box);
  }

  global.SightGuideUI = { appendSightGuide: appendSightGuide };
})(typeof window !== "undefined" ? window : globalThis);
