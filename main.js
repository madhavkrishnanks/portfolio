/* ==================================================================
   main.js — renders the site from data.js
   ================================================================== */

(function () {
  "use strict";

  /* ---------- theme ---------- */

  var root = document.documentElement;

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) btn.textContent = t === "dark" ? "Light" : "Dark";
    try {
      localStorage.setItem("theme", t);
    } catch (e) {}
  }

  function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (e) {}
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }

  function wireTheme() {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------- tiny helpers ---------- */

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c];
    });
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var s = seed || 1;
    return function () {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- generated board glyph ----------
     A deterministic PCB-ish trace drawing, unique per project slug.
     Pure SVG, no image files, no external assets. */

  function boardGlyph(seedStr, accent) {
    var r = rng(hash(seedStr));
    var W = 320;
    var H = 200;
    var PAD = 20;
    var STEP = 20;
    var out = [];

    out.push(
      '<svg viewBox="0 0 ' +
        W +
        " " +
        H +
        '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
    );

    // grid of vias
    for (var x = PAD; x <= W - PAD; x += STEP) {
      for (var y = PAD; y <= H - PAD; y += STEP) {
        out.push(
          '<circle cx="' +
            x +
            '" cy="' +
            y +
            '" r="0.9" fill="currentColor" opacity="0.28"/>'
        );
      }
    }

    function snap(v) {
      return Math.max(PAD, Math.min(W - PAD, Math.round(v / STEP) * STEP));
    }

    // traces
    var count = 4 + Math.floor(r() * 3);
    for (var i = 0; i < count; i++) {
      var px = snap(PAD + r() * (W - 2 * PAD));
      var py = snap(PAD + r() * (H - 2 * PAD));
      var d = "M" + px + " " + py;
      var segs = 3 + Math.floor(r() * 3);
      for (var k = 0; k < segs; k++) {
        var len = (1 + Math.floor(r() * 4)) * STEP;
        if (r() > 0.5) {
          px = snap(px + (r() > 0.5 ? len : -len));
          d += "H" + px;
        } else {
          py = snap(py + (r() > 0.5 ? len : -len));
          d += "V" + py;
        }
      }
      var strong = i === 0;
      out.push(
        '<path d="' +
          d +
          '" fill="none" stroke="' +
          (strong ? accent : "currentColor") +
          '" stroke-width="' +
          (strong ? 1.6 : 1.1) +
          '" stroke-linejoin="round" opacity="' +
          (strong ? 0.85 : 0.5) +
          '"/>'
      );
      out.push(
        '<circle cx="' +
          px +
          '" cy="' +
          py +
          '" r="' +
          (strong ? 3 : 2.2) +
          '" fill="' +
          (strong ? accent : "currentColor") +
          '" opacity="' +
          (strong ? 0.95 : 0.65) +
          '"/>'
      );
    }

    // one package outline — a small rectangle with pins, placed off-centre
    var bw = 60 + Math.floor(r() * 40);
    var bh = 40 + Math.floor(r() * 30);
    var bx = snap(PAD + r() * (W - 2 * PAD - bw));
    var by = snap(PAD + r() * (H - 2 * PAD - bh));
    out.push(
      '<rect x="' +
        bx +
        '" y="' +
        by +
        '" width="' +
        bw +
        '" height="' +
        bh +
        '" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55"/>'
    );
    var pinGap = 12;
    for (var p = bx + 8; p < bx + bw - 6; p += pinGap) {
      out.push(
        '<line x1="' +
          p +
          '" y1="' +
          by +
          '" x2="' +
          p +
          '" y2="' +
          (by - 5) +
          '" stroke="currentColor" stroke-width="1.1" opacity="0.45"/>'
      );
      out.push(
        '<line x1="' +
          p +
          '" y1="' +
          (by + bh) +
          '" x2="' +
          p +
          '" y2="' +
          (by + bh + 5) +
          '" stroke="currentColor" stroke-width="1.1" opacity="0.45"/>'
      );
    }

    out.push("</svg>");
    return out.join("");
  }

  /* ---------- render: index ---------- */

  function renderHero() {
    var host = document.querySelector("[data-hero]");
    if (!host) return;

    var links = PROFILE.links
      .map(function (l) {
        return (
          '<a class="chip" href="' +
          esc(l.href) +
          '"' +
          (/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : "") +
          ">" +
          esc(l.label) +
          ' <span class="arrow">&#8599;</span></a>'
        );
      })
      .join("");

    host.innerHTML =
      '<div class="hero-status"><span class="dot"></span>' +
      esc(PROFILE.status) +
      "</div>" +
      "<h1>" +
      esc(PROFILE.name) +
      "</h1>" +
      '<p class="hero-role">' +
      esc(PROFILE.role) +
      "</p>" +
      '<p class="hero-tagline">' +
      esc(PROFILE.tagline) +
      "</p>" +
      '<div class="hero-links">' +
      links +
      "</div>";
  }

  function renderProjects() {
    var host = document.querySelector("[data-projects]");
    if (!host) return;

    var accent = "var(--accent)";

    host.innerHTML = PROJECTS.map(function (p, i) {
      var n = String(i + 1).padStart(2, "0");
      var tags = (p.stack || [])
        .map(function (t) {
          return '<span class="tag">' + esc(t) + "</span>";
        })
        .join("");

      return (
        '<article class="card reveal">' +
        '<div class="card-media">' +
        boardGlyph(p.slug, accent) +
        "</div>" +
        '<div class="card-body">' +
        '<div class="card-kicker"><span>P' +
        n +
        "</span><span>" +
        esc(p.year) +
        "</span></div>" +
        '<h3><a href="project.html?p=' +
        encodeURIComponent(p.slug) +
        '">' +
        esc(p.title) +
        "</a></h3>" +
        '<p class="card-summary">' +
        esc(p.summary) +
        "</p>" +
        '<div class="tags">' +
        tags +
        "</div>" +
        "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderExperience() {
    var host = document.querySelector("[data-experience]");
    if (!host) return;

    host.innerHTML = EXPERIENCE.map(function (x) {
      var bullets = (x.bullets || [])
        .map(function (b) {
          return "<li>" + esc(b) + "</li>";
        })
        .join("");

      return (
        '<div class="xp-row reveal">' +
        '<div class="xp-period">' +
        esc(x.period) +
        "</div>" +
        "<div>" +
        '<h3 class="xp-role">' +
        esc(x.role) +
        "</h3>" +
        '<p class="xp-org">' +
        esc(x.org) +
        (x.place ? '<span class="sep">/</span>' + esc(x.place) : "") +
        "</p>" +
        "<ul>" +
        bullets +
        "</ul>" +
        "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderRecognition() {
    var host = document.querySelector("[data-recognition]");
    if (!host || typeof RECOGNITION === "undefined") return;

    host.innerHTML = RECOGNITION.map(function (r) {
      var link = r.link
        ? '<a class="rec-link" href="' +
          esc(r.link.href) +
          '" target="_blank" rel="noopener">' +
          esc(r.link.label) +
          " &#8599;</a>"
        : "";

      return (
        '<div class="rec-row reveal">' +
        '<div class="rec-meta"><span class="rec-kind">' +
        esc(r.kind) +
        '</span><span class="rec-date">' +
        esc(r.date) +
        "</span></div>" +
        '<div class="rec-body">' +
        '<h3 class="rec-title">' +
        esc(r.title) +
        "</h3>" +
        '<p class="rec-org">' +
        esc(r.org) +
        "</p>" +
        (r.note ? '<p class="rec-note">' + esc(r.note) + "</p>" : "") +
        link +
        "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderSkills() {
    var host = document.querySelector("[data-skills]");
    if (!host) return;

    host.innerHTML = SKILLS.map(function (g) {
      var items = g.items
        .map(function (it) {
          return (
            "<li><span>" +
            esc(it.name) +
            '</span><span class="lvl">' +
            esc(it.level) +
            "</span></li>"
          );
        })
        .join("");

      return (
        '<div class="skill-group reveal">' +
        "<h4>" +
        esc(g.group) +
        "</h4>" +
        '<ul class="skill-list">' +
        items +
        "</ul>" +
        "</div>"
      );
    }).join("");
  }

  function renderAbout() {
    var host = document.querySelector("[data-about]");
    if (!host) return;

    var ps = ABOUT.paragraphs
      .map(function (t) {
        return "<p>" + esc(t) + "</p>";
      })
      .join("");

    var now = ABOUT.now
      .map(function (n) {
        return (
          '<li><span class="k">' +
          esc(n.label) +
          "</span><span>" +
          esc(n.value) +
          "</span></li>"
        );
      })
      .join("");

    host.innerHTML =
      '<div class="about-grid">' +
      '<div class="reveal">' +
      ps +
      "</div>" +
      '<ul class="now reveal">' +
      now +
      "</ul>" +
      "</div>";
  }

  function renderContact() {
    var host = document.querySelector("[data-contact]");
    if (!host) return;

    var rows = PROFILE.links
      .map(function (l) {
        return (
          '<div class="contact-row"><span class="k">' +
          esc(l.label) +
          '</span><a class="v" href="' +
          esc(l.href) +
          '"' +
          (/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : "") +
          ">" +
          esc(l.label) +
          " &#8599;</a></div>"
        );
      })
      .join("");

    host.innerHTML =
      "<h2>Get in touch.</h2>" +
      '<p class="hero-tagline">The fastest way to reach me is email. I answer everything.</p>' +
      '<div class="contact-rows">' +
      '<div class="contact-row"><span class="k">Email</span><a class="v" href="mailto:' +
      esc(PROFILE.email) +
      '">' +
      esc(PROFILE.email) +
      "</a></div>" +
      rows +
      "</div>";
  }

  /* ---------- render: project detail ---------- */

  function renderProject() {
    var host = document.querySelector("[data-project]");
    if (!host) return;

    var params = new URLSearchParams(window.location.search);
    var slug = params.get("p");
    var idx = -1;

    for (var i = 0; i < PROJECTS.length; i++) {
      if (PROJECTS[i].slug === slug) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      host.innerHTML =
        '<div class="detail-head wrap"><a class="back" href="index.html">&#8592; All work</a>' +
        "<h1>Project not found</h1>" +
        '<p class="detail-lede">That link does not match anything in the project list. ' +
        'Check the address, or go back to the index.</p></div>';
      document.title = "Not found — " + PROFILE.name;
      return;
    }

    var p = PROJECTS[idx];
    var prev = PROJECTS[idx - 1] || null;
    var next = PROJECTS[idx + 1] || null;

    document.title = p.title + " — " + PROFILE.name;

    var stack = (p.stack || []).join(" · ");
    var body = (p.body || [])
      .map(function (t) {
        return "<p>" + esc(t) + "</p>";
      })
      .join("");

    var highlights = (p.highlights || []).length
      ? '<div class="hl-box reveal"><h4>Results &amp; findings</h4><ul>' +
        p.highlights
          .map(function (h) {
            return "<li>" + esc(h) + "</li>";
          })
          .join("") +
        "</ul></div>"
      : "";

    var links = (p.links || []).length
      ? '<div class="hl-box reveal"><h4>Links</h4><ul>' +
        p.links
          .map(function (l) {
            return (
              '<li><a href="' +
              esc(l.href) +
              '" target="_blank" rel="noopener" style="border-bottom:1px solid var(--rule-strong)">' +
              esc(l.label) +
              " &#8599;</a></li>"
            );
          })
          .join("") +
        "</ul></div>"
      : "";

    var media = (p.media || []).length
      ? '<div class="media-strip">' +
        p.media
          .map(function (m) {
            var inner = m.src
              ? '<img src="' + esc(m.src) + '" alt="' + esc(m.caption || "") + '">'
              : '<span class="ph">image</span>';
            return (
              '<figure class="media-item reveal" style="margin:0">' +
              '<div class="media-frame">' +
              inner +
              "</div>" +
              (m.caption
                ? '<figcaption class="media-cap">' + esc(m.caption) + "</figcaption>"
                : "") +
              "</figure>"
            );
          })
          .join("") +
        "</div>"
      : "";

    var nav =
      '<div class="detail-nav">' +
      (prev
        ? '<a href="project.html?p=' +
          encodeURIComponent(prev.slug) +
          '">&#8592; ' +
          esc(prev.title) +
          "</a>"
        : '<span class="spacer"></span>') +
      '<span class="spacer"></span>' +
      (next
        ? '<a href="project.html?p=' +
          encodeURIComponent(next.slug) +
          '">' +
          esc(next.title) +
          " &#8594;</a>"
        : "") +
      "</div>";

    host.innerHTML =
      '<div class="detail-head wrap">' +
      '<a class="back" href="index.html">&#8592; All work</a>' +
      "<h1>" +
      esc(p.title) +
      "</h1>" +
      '<p class="detail-lede">' +
      esc(p.summary) +
      "</p>" +
      '<div class="meta">' +
      '<div><div class="k">Year</div><div class="v">' +
      esc(p.year) +
      "</div></div>" +
      '<div><div class="k">Role</div><div class="v">' +
      esc(p.role) +
      "</div></div>" +
      '<div><div class="k">Stack</div><div class="v">' +
      esc(stack) +
      "</div></div>" +
      '<div><div class="k">Index</div><div class="v">P' +
      String(idx + 1).padStart(2, "0") +
      " of " +
      String(PROJECTS.length).padStart(2, "0") +
      "</div></div>" +
      "</div>" +
      "</div>" +
      '<div class="wrap"><div class="detail-body">' +
      '<div class="prose">' +
      body +
      "</div>" +
      "<div>" +
      highlights +
      links +
      "</div>" +
      "</div>" +
      media +
      nav +
      "</div>";
  }

  /* ---------- reveal on scroll ---------- */

  function wireReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add("in");
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* ---------- boot ---------- */

  function boot() {
    initTheme();
    wireTheme();
    renderHero();
    renderProjects();
    renderExperience();
    renderRecognition();
    renderSkills();
    renderAbout();
    renderContact();
    renderProject();
    wireReveal();

    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
