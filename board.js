/* ==================================================================
   board.js — exploded PCB hero
   Five layers, drawn as SVG, separated on scroll.
   Loaded after data.js and before main.js.
   ================================================================== */

(function () {
  "use strict";

  var W = 420;
  var H = 300;

  function svg(inner) {
    return (
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      inner +
      "</svg>"
    );
  }

  /* pad / via positions shared between layers so things line up */
  var PADS = [
    [44, 62],
    [300, 126],
    [44, 96],
    [252, 246],
    [330, 54],
    [236, 212],
    [64, 246],
    [196, 186],
    [120, 96],
    [330, 170]
  ];

  function pads(r, fill, opacity) {
    return (
      '<g fill="' +
      fill +
      '" opacity="' +
      opacity +
      '">' +
      PADS.map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '"/>';
      }).join("") +
      "</g>"
    );
  }

  /* ---------- layer 1: substrate ---------- */

  var substrate = svg(
    '<rect x="8" y="8" width="404" height="284" rx="10" fill="var(--board-sub)" ' +
      'stroke="var(--board-edge)" stroke-width="1.6"/>' +
      '<g fill="var(--board-hole)" stroke="var(--board-edge)" stroke-width="1.4">' +
      '<circle cx="34" cy="34" r="8"/><circle cx="386" cy="34" r="8"/>' +
      '<circle cx="34" cy="266" r="8"/><circle cx="386" cy="266" r="8"/>' +
      "</g>"
  );

  /* ---------- layer 2: copper ---------- */

  var TRACES = [
    "M44 62 H176 V126 H300",
    "M44 96 H118 V206 H252 V246",
    "M330 54 V150 H236 V212",
    "M64 246 H196 V186",
    "M120 96 V62 H176",
    "M300 126 V170 H330",
    "M236 212 H150"
  ];

  var copper = svg(
    '<g stroke="var(--board-copper)" fill="none" stroke-width="2.2" ' +
      'stroke-linejoin="round" stroke-linecap="round" opacity="0.95">' +
      TRACES.map(function (d) {
        return '<path d="' + d + '"/>';
      }).join("") +
      "</g>" +
      '<rect x="248" y="172" width="116" height="86" fill="var(--board-copper)" opacity="0.13"/>' +
      '<rect x="118" y="52" width="80" height="52" fill="var(--board-copper)" opacity="0.1"/>' +
      pads(3.6, "var(--board-copper)", "1")
  );

  /* ---------- layer 3: soldermask ---------- */

  var mask = svg(
    '<rect x="8" y="8" width="404" height="284" rx="10" fill="var(--board-sub)" opacity="0.34"/>' +
    pads(2.4, "var(--board-gold)", "0.9")
  );

  /* ---------- layer 4: silkscreen ---------- */

  var silk = svg(
    '<g stroke="var(--board-silk)" fill="none" stroke-width="1.1" opacity="0.9">' +
      '<rect x="148" y="93" width="76" height="76" rx="2"/>' +
      '<rect x="58" y="148" width="34" height="18" rx="1"/>' +
      '<rect x="300" y="36" width="46" height="20" rx="1"/>' +
      '<rect x="256" y="182" width="44" height="26" rx="1"/>' +
      '<circle cx="34" cy="34" r="12"/>' +
      "</g>" +
      '<g fill="var(--board-silk)" font-family="IBM Plex Mono, ui-monospace, monospace" ' +
      'font-size="9" letter-spacing="0.9" opacity="0.92">' +
      '<text x="148" y="87">U1</text>' +
      '<text x="58" y="142">R4</text>' +
      '<text x="300" y="30">J1</text>' +
      '<text x="256" y="176">Y2</text>' +
      '<text x="308" y="230">C11</text>' +
      '<text x="16" y="286" opacity="0.75">MADHAVKRISHNAN · REV A</text>' +
      "</g>"
  );

  /* ---------- layer 5: components ---------- */

  var pins = (function () {
    var out = [];
    var i;
    for (i = 0; i < 7; i++) {
      var x = 152 + i * 10;
      out.push(
        '<rect x="' + x + '" y="87" width="5" height="7" fill="var(--board-gold)"/>'
      );
      out.push(
        '<rect x="' + x + '" y="168" width="5" height="7" fill="var(--board-gold)"/>'
      );
    }
    for (i = 0; i < 5; i++) {
      out.push(
        '<rect x="' + (304 + i * 9) + '" y="38" width="6" height="6" fill="var(--board-gold)"/>'
      );
      out.push(
        '<rect x="' + (304 + i * 9) + '" y="48" width="6" height="6" fill="var(--board-gold)"/>'
      );
    }
    return out.join("");
  })();

  var components = svg(
    pins +
      '<rect x="148" y="93" width="76" height="76" rx="3" fill="var(--board-ic)"/>' +
      '<circle cx="160" cy="105" r="2.6" fill="var(--board-silk)" opacity="0.5"/>' +
      '<rect x="58" y="148" width="34" height="18" rx="1" fill="var(--board-part)"/>' +
      '<rect x="256" y="182" width="44" height="26" rx="2" fill="var(--board-part)"/>' +
      '<rect x="300" y="36" width="46" height="20" rx="1" fill="var(--board-ic)"/>'
  );

  var LAYERS = [
    { svg: substrate, cls: "layer layer-sub", plate: false },
    { svg: copper, cls: "layer", plate: true },
    { svg: mask, cls: "layer", plate: true },
    { svg: silk, cls: "layer", plate: true },
    { svg: components, cls: "layer layer-top", plate: true }
  ];

  function mount() {
    var inner = document.querySelector("[data-board]");
    if (!inner) return;

    var spread = 34;
    var BASE = 0.14;

    inner.innerHTML = LAYERS.map(function (l, i) {
      var dy = (2 - i) * spread;
      return (
        '<div class="' +
        l.cls +
        '" style="--dy:' +
        dy +
        '">' +
        (l.plate ? '<div class="plate"></div>' : "") +
        l.svg +
        "</div>"
      );
    }).join("");

    var hero = inner.closest(".hero") || inner.parentNode;
    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrow =
      window.matchMedia && window.matchMedia("(max-width: 900px)").matches;

    if (reduce || narrow) {
      hero.style.setProperty("--p", String(BASE));
      return;
    }

    /* the board assembles itself once on load, then sits assembled.
       scrolling away adds a little separation for depth. */

    var assembled = false;

    function scrollOffset() {
      var h = hero.offsetHeight || 620;
      var scrolled = window.scrollY || window.pageYOffset || 0;
      var t = Math.min(1, Math.max(0, scrolled / h));
      return BASE + 0.2 * t;
    }

    function assemble() {
      var dur = 1500;
      var t0 = null;

      hero.style.setProperty("--p", "1");

      function ease(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function frame(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / dur);
        var p = 1 + (BASE - 1) * ease(t);
        hero.style.setProperty("--p", p.toFixed(3));
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          assembled = true;
        }
      }

      requestAnimationFrame(frame);
    }

    var ticking = false;

    function update() {
      ticking = false;
      if (!assembled) return;
      hero.style.setProperty("--p", scrollOffset().toFixed(3));
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );

    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width - 0.5;
      var my = (e.clientY - r.top) / r.height - 0.5;
      hero.style.setProperty("--mx", (mx * 2).toFixed(3));
      hero.style.setProperty("--my", (my * 2).toFixed(3));
    });

    hero.addEventListener("mouseleave", function () {
      hero.style.setProperty("--mx", "0");
      hero.style.setProperty("--my", "0");
    });

    setTimeout(assemble, 260);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
