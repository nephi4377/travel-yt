/** Shared helpers: attach §3.2/§3.3 place blocks onto itinerary cards (plan tab). */
(function (global) {
  "use strict";

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mosaicClass(n, seed) {
    if (n <= 1) return "pm--1";
    if (n === 2) return "pm--2";
    if (n === 3) return "pm--3";
    return ["pm--4a", "pm--4b", "pm--4c"][seed % 3];
  }

  function appendMosaic(parent, photos, seed) {
    if (!photos || !photos.length) return;
    var n = Math.min(photos.length, 4);
    var box = el("div", "photomosaic " + mosaicClass(n, seed || 0));
    photos.slice(0, 4).forEach(function (p, i) {
      var fig = document.createElement("figure");
      fig.className = "pm-cell pm-cell-" + (i + 1);
      var img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = p.src;
      img.alt = p.alt || "";
      fig.append(img);
      box.append(fig);
    });
    parent.append(box);
    var credits = [];
    var seen = {};
    photos.forEach(function (p) {
      if (p.credit && !seen[p.credit]) {
        seen[p.credit] = 1;
        credits.push(p.credit);
      }
    });
    if (credits.length) parent.append(el("p", "photocap", credits.join(" · ")));
  }

  function appendPlaceHistory(parent, place) {
    if (!place || !place.themes || !place.themes.length) return;
    var det = document.createElement("details");
    det.className = "detailbox histwrap";
    det.innerHTML = "<summary>在地歷史與特色</summary>";
    var body = el("div", "detailbody");
    place.themes.forEach(function (th) {
      var td = document.createElement("details");
      td.className = "themebox";
      var sm = document.createElement("summary");
      sm.textContent = th.t;
      var p = document.createElement("p");
      p.textContent = th.b;
      td.append(sm, p);
      body.append(td);
    });
    det.append(body);
    parent.append(det);
  }

  function appendLearnLinks(parent, links) {
    if (!links || !links.length) return;
    var row = el("div", "learnrow");
    var lab = el("span", "small", "想再了解：");
    lab.style.marginRight = "4px";
    row.append(lab);
    links.forEach(function (l) {
      var a = document.createElement("a");
      a.href = l.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = l.label;
      row.append(a);
    });
    parent.append(row);
  }

  /** Walk / dress / timing tips — on the itinerary card, not inside history. */
  function appendWalkTips(parent, tips) {
    if (!tips || !tips.length) return;
    var box = el("div", "walktips");
    box.append(el("p", "meta", "<b>行程走法：</b>" + tips.map(function (t) {
      return "・" + t;
    }).join(" ")));
    parent.append(box);
  }

  function placeGuideTexts(placesCatalog, ids) {
    var intros = {};
    var shots = {};
    (ids || []).forEach(function (id) {
      var place = placesCatalog && placesCatalog[id];
      var g = place && place.guide;
      if (!g) return;
      if (g.intro) intros[String(g.intro).trim()] = 1;
      (g.shots || []).forEach(function (s) {
        if (s) shots[String(s).trim()] = 1;
      });
    });
    return { intros: intros, shots: shots };
  }

  /**
   * Keep card.detail.intro visible outside history (logistics notes).
   * Do NOT resurface card.detail.shots — photo tips only come from place
   * guides (§3.2). Hotels / airports / assembly / shops must not get
   * suggested shots from leftover card.detail data.
   */
  function appendCardDetailExtras(parent, card, placesCatalog) {
    var d = card && card.detail;
    if (!d) return;
    var ids = card.places || [];
    var covered = placeGuideTexts(placesCatalog, ids);
    var intro = d.intro && String(d.intro).trim();
    if (intro) {
      var introCovered =
        !!covered.intros[intro] ||
        Object.keys(covered.intros).some(function (p) {
          return p.indexOf(intro) !== -1 || intro.indexOf(p) !== -1;
        });
      if (!introCovered) parent.append(el("p", "meta card-note", intro));
    }
  }

  /**
   * One place block: intro / 看點 / 建議拍照 (open) + mosaic + history (collapsed) + learn.
   * Shopping/workshop: only the shop note, no history / shots.
   */
  function appendPlaceBlock(parent, place, seed, opts) {
    if (!place) return;
    opts = opts || {};
    var wrap = el("div", "placeblock");
    if (opts.showTitle !== false && place.title) {
      wrap.append(el("h4", "placename", place.title));
    }
    if (place.kind === "shop") {
      wrap.append(el("p", "meta", "行程安排、不需要可不買"));
      parent.append(wrap);
      return;
    }
    if (global.SightGuideUI) {
      global.SightGuideUI.appendSightGuide(wrap, place, { tips: false });
    }
    appendMosaic(wrap, place.photos, seed);
    appendPlaceHistory(wrap, place);
    appendLearnLinks(wrap, place.learn);
    parent.append(wrap);
  }

  function collectWalkTips(card, placesCatalog) {
    var tips = [];
    var seen = {};
    function add(list) {
      (list || []).forEach(function (t) {
        if (!t || seen[t]) return;
        seen[t] = 1;
        tips.push(t);
      });
    }
    add(card.walkTips);
    if (card.detail) add(card.detail.tips);
    (card.places || []).forEach(function (id) {
      var place = placesCatalog && placesCatalog[id];
      if (place && place.guide) add(place.guide.tips);
    });
    return tips;
  }

  /**
   * Attach places[] (and optional card-level tips) under an itinerary card grow node.
   * placesCatalog = SHANGHAI_PLACES / TURKEY_PLACES
   */
  function appendCardPlaces(grow, card, placesCatalog, seedBase) {
    appendWalkTips(grow, collectWalkTips(card, placesCatalog));
    appendCardDetailExtras(grow, card, placesCatalog);

    var ids = card.places || [];
    if (!ids.length) return;
    var multi = ids.length > 1;
    ids.forEach(function (id, i) {
      var place = placesCatalog && placesCatalog[id];
      if (!place) return;
      appendPlaceBlock(grow, place, (seedBase || 0) + i, {
        showTitle: multi || ids.length === 1
      });
    });
  }

  global.TripPlaceCard = {
    el: el,
    appendMosaic: appendMosaic,
    appendPlaceHistory: appendPlaceHistory,
    appendLearnLinks: appendLearnLinks,
    appendWalkTips: appendWalkTips,
    appendCardDetailExtras: appendCardDetailExtras,
    appendPlaceBlock: appendPlaceBlock,
    appendCardPlaces: appendCardPlaces
  };
})(typeof window !== "undefined" ? window : globalThis);
