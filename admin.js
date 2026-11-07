/* ==========================================================================
   admin.js — GitHub REST API Content & Image Manager
   Zero dependencies. Reads/writes content.json and uploads client-side
   compressed JPEG images directly to madhavkrishnanks/portfolio.
   ========================================================================== */
(function () {
  "use strict";

  const REPO_OWNER = "madhavkrishnanks";
  const REPO_NAME = "portfolio";
  const CONTENT_PATH = "content.json";
  const API_BASE = "https://api.github.com";
  const TOKEN_STORAGE_KEY = "mk_portfolio_gh_token";
  const BACKUP_STORAGE_KEY = "mk_portfolio_last_backup";

  // Application State
  let memoryToken = "";
  let storageAvailable = true;
  let defaultBranch = "main";
  let currentSha = null;
  let originalContentJson = "";
  let content = null;
  let activeTab = "profile";
  let selectedProjectIndex = 0;
  let dirtyReasons = [];
  let unreferencedUploads = []; // paths committed to images/ but not yet saved in content.json

  // Check localStorage availability
  try {
    const testKey = "__mk_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  } catch (_) {
    storageAvailable = false;
  }

  // --------------------------------------------------------------------------
  // Theme Handling
  // --------------------------------------------------------------------------
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = t === "dark" ? "Light" : "Dark";
    try {
      if (storageAvailable) localStorage.setItem("theme", t);
    } catch (_) {}
  }

  function initTheme() {
    let saved = null;
    try {
      if (storageAvailable) saved = localStorage.getItem("theme");
    } catch (_) {}
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        const cur =
          document.documentElement.getAttribute("data-theme") === "dark"
            ? "dark"
            : "light";
        applyTheme(cur === "dark" ? "light" : "dark");
      });
    }
  }

  // --------------------------------------------------------------------------
  // Token Storage Helpers (Never log, never expose, mask as ••••)
  // --------------------------------------------------------------------------
  function getToken() {
    if (memoryToken) return memoryToken;
    if (!storageAvailable) return "";
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setToken(tok) {
    memoryToken = tok;
    if (!storageAvailable) return;
    try {
      if (tok) localStorage.setItem(TOKEN_STORAGE_KEY, tok);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (_) {}
  }

  function clearToken() {
    memoryToken = "";
    if (storageAvailable) {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (_) {}
    }
  }

  // --------------------------------------------------------------------------
  // UTF-8 <-> Base64 Conversion (TextEncoder / TextDecoder, no unescape)
  // --------------------------------------------------------------------------
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(
        String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
      );
    }
    return btoa(chunks.join(""));
  }

  function base64ToUtf8(b64) {
    const clean = String(b64 || "").replace(/\s+/g, "");
    const binString = atob(clean);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(
        String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
      );
    }
    return btoa(chunks.join(""));
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // --------------------------------------------------------------------------
  // GitHub REST API Client
  // --------------------------------------------------------------------------
  function ghHeaders() {
    return {
      Authorization: "Bearer " + getToken(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function formatApiError(res, context) {
    const rateRem = res.headers.get("X-RateLimit-Remaining");
    const rateSuffix =
      rateRem !== null ? " (X-RateLimit-Remaining: " + rateRem + ")" : "";
    if (res.status === 401) {
      return "token rejected";
    }
    if (res.status === 403) {
      return "token lacks Contents write permission" + rateSuffix;
    }
    if (res.status === 404) {
      return context === "repo"
        ? "repo not found or token not scoped to it"
        : "file or path not found on branch " + defaultBranch;
    }
    if (res.status === 409) {
      return "SHA conflict on GitHub (409) — file was modified elsewhere";
    }
    if (res.status === 422) {
      return "GitHub validation error (422) — check payload or SHA";
    }
    return "GitHub API error (HTTP " + res.status + ")" + rateSuffix;
  }

  async function verifyRepoAccess() {
    const url = API_BASE + "/repos/" + REPO_OWNER + "/" + REPO_NAME;
    const res = await fetch(url, {
      method: "GET",
      headers: ghHeaders(),
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error(formatApiError(res, "repo"));
    }
    const repoData = await res.json();
    defaultBranch = repoData.default_branch || "main";
    return {
      fullName: repoData.full_name || REPO_OWNER + "/" + REPO_NAME,
      defaultBranch: defaultBranch
    };
  }

  async function fetchRemoteContentJson() {
    const url =
      API_BASE +
      "/repos/" +
      REPO_OWNER +
      "/" +
      REPO_NAME +
      "/contents/" +
      encodeURIComponent(CONTENT_PATH) +
      "?ref=" +
      encodeURIComponent(defaultBranch);

    const res = await fetch(url, {
      method: "GET",
      headers: ghHeaders(),
      cache: "no-store"
    });

    if (res.status === 404) {
      // Fallback: if content.json is not yet committed to repo, try fetching local content.json
      const localRes = await fetch("content.json", { cache: "no-store" });
      if (localRes.ok) {
        const text = await localRes.text();
        currentSha = null;
        return { parsed: JSON.parse(text), rawText: text, sha: null };
      }
      throw new Error(
        "content.json not found in repository. Upload content.json first."
      );
    }

    if (!res.ok) {
      throw new Error(formatApiError(res, "file"));
    }

    const payload = await res.json();
    const decoded = base64ToUtf8(payload.content);
    const parsed = JSON.parse(decoded);
    currentSha = payload.sha;
    return { parsed: parsed, rawText: decoded, sha: payload.sha };
  }

  async function getLatestFileSha(path) {
    const url =
      API_BASE +
      "/repos/" +
      REPO_OWNER +
      "/" +
      REPO_NAME +
      "/contents/" +
      path
        .split("/")
        .map(encodeURIComponent)
        .join("/") +
      "?ref=" +
      encodeURIComponent(defaultBranch);

    const res = await fetch(url, {
      method: "GET",
      headers: ghHeaders(),
      cache: "no-store"
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(formatApiError(res, "file"));
    const data = await res.json();
    return data.sha || null;
  }

  async function putContentJsonWithRetry(jsonString, commitMessage) {
    const b64 = utf8ToBase64(jsonString);
    const url =
      API_BASE +
      "/repos/" +
      REPO_OWNER +
      "/" +
      REPO_NAME +
      "/contents/" +
      encodeURIComponent(CONTENT_PATH);

    // Step 1: Always GET current file first to obtain its latest sha
    let sha = await getLatestFileSha(CONTENT_PATH);

    async function attemptPut(targetSha) {
      const body = {
        message: commitMessage,
        content: b64,
        branch: defaultBranch
      };
      if (targetSha) body.sha = targetSha;
      return fetch(url, {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders()),
        body: JSON.stringify(body)
      });
    }

    let res = await attemptPut(sha);
    // Step 2: If 409 conflict, re-fetch sha and retry once
    if (res.status === 409) {
      sha = await getLatestFileSha(CONTENT_PATH);
      res = await attemptPut(sha);
    }

    if (!res.ok) {
      throw new Error(formatApiError(res, "file"));
    }

    const result = await res.json();
    if (result && result.content && result.content.sha) {
      currentSha = result.content.sha;
    }
    return result;
  }

  async function putNewBinaryImage(repoPath, base64Data, projectTitle) {
    const url =
      API_BASE +
      "/repos/" +
      REPO_OWNER +
      "/" +
      REPO_NAME +
      "/contents/" +
      repoPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");

    const body = {
      message: "images: add photo to " + projectTitle,
      content: base64Data,
      branch: defaultBranch
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders()),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(formatApiError(res, "file"));
    }
    return res.json();
  }

  // --------------------------------------------------------------------------
  // Client-Side Image Compression (<canvas> max 1600px, JPEG 0.82 -> 0.60)
  // --------------------------------------------------------------------------
  function compressImageToJpegBase64(file) {
    return new Promise(function (resolve, reject) {
      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = function () {
        URL.revokeObjectURL(objUrl);
        reject(
          new Error(
            "Browser could not decode " +
              (file.name || "image") +
              ". Use JPEG, PNG, or WebP."
          )
        );
      };
      img.onload = function () {
        try {
          const maxEdge = 1600;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxEdge || h > maxEdge) {
            if (w >= h) {
              h = Math.round((h * maxEdge) / w);
              w = maxEdge;
            } else {
              w = Math.round((w * maxEdge) / h);
              h = maxEdge;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#faf8f4";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          function tryExport(q) {
            return new Promise(function (resBlob) {
              canvas.toBlob(
                function (blob) {
                  resBlob(blob);
                },
                "image/jpeg",
                q
              );
            });
          }

          (async function () {
            let quality = 0.82;
            let blob = await tryExport(quality);
            while (blob && blob.size > 300 * 1024 && quality > 0.6) {
              quality = Math.max(0.6, +(quality - 0.06).toFixed(2));
              blob = await tryExport(quality);
            }
            if (!blob) {
              reject(new Error("Canvas JPEG encoding failed"));
              return;
            }
            const buf = await blob.arrayBuffer();
            const b64 = arrayBufferToBase64(buf);
            const baseName = (file.name || "photo")
              .replace(/\.[^.]+$/, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "photo";

            resolve({
              base64: b64,
              objectUrl: objUrl,
              safeFilename: baseName + ".jpg",
              sizeKB: Math.round(blob.size / 1024),
              quality: quality
            });
          })();
        } catch (err) {
          URL.revokeObjectURL(objUrl);
          reject(err);
        }
      };
      img.src = objUrl;
    });
  }

  // --------------------------------------------------------------------------
  // UI Notifications, Dirty Tracking & Diff Calculation
  // --------------------------------------------------------------------------
  function showNotice(message, type) {
    const box = document.getElementById("globalNotice");
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      box.className = "admin-notice";
      return;
    }
    box.hidden = false;
    box.textContent = message;
    box.className =
      "admin-notice" +
      (type === "error" ? " is-error" : type === "ok" ? " is-ok" : "");
  }

  function hasDuplicateSlugs() {
    if (!content || !Array.isArray(content.projects)) return null;
    const seen = new Set();
    for (let i = 0; i < content.projects.length; i++) {
      const s = String(content.projects[i].slug || "").trim();
      if (!s) return "Project #" + (i + 1) + " has an empty slug.";
      if (seen.has(s)) return 'Duplicate project slug "' + s + '" — slugs must be unique.';
      seen.add(s);
    }
    return null;
  }

  function computeDiffSummary() {
    if (!content || !originalContentJson) return [];
    const orig = JSON.parse(originalContentJson);
    const changes = [];

    if (JSON.stringify(orig.profile) !== JSON.stringify(content.profile)) {
      changes.push("update Profile");
    }
    if (JSON.stringify(orig.projects) !== JSON.stringify(content.projects)) {
      // Find specific project titles changed or added
      const origSlugs = new Map(
        (orig.projects || []).map(function (p) {
          return [p.slug, JSON.stringify(p)];
        })
      );
      const touched = [];
      (content.projects || []).forEach(function (p) {
        if (!origSlugs.has(p.slug)) {
          touched.push("add " + (p.title || p.slug));
        } else if (origSlugs.get(p.slug) !== JSON.stringify(p)) {
          touched.push("update " + (p.title || p.slug));
        }
      });
      if (
        touched.length === 0 &&
        (orig.projects || []).length !== (content.projects || []).length
      ) {
        touched.push("delete project");
      } else if (touched.length === 0) {
        touched.push("reorder projects");
      }
      changes.push(touched.slice(0, 3).join(", "));
    }
    if (JSON.stringify(orig.experience) !== JSON.stringify(content.experience)) {
      changes.push("update Experience");
    }
    if (JSON.stringify(orig.recognition) !== JSON.stringify(content.recognition)) {
      changes.push("update Recognition");
    }
    if (JSON.stringify(orig.skills) !== JSON.stringify(content.skills)) {
      changes.push("update Skills");
    }
    if (JSON.stringify(orig.about) !== JSON.stringify(content.about)) {
      changes.push("update About");
    }
    return changes;
  }

  function buildCommitMessage() {
    const diffs = computeDiffSummary();
    if (diffs.length === 0) return "content: update content.json";
    return "content: " + diffs.join("; ");
  }

  function updateSaveBar() {
    const ind = document.getElementById("dirtyIndicator");
    const sum = document.getElementById("diffSummary");
    const saveBtn = document.getElementById("saveToGithubBtn");
    const restoreBtn = document.getElementById("restoreBackupBtn");

    if (restoreBtn && storageAvailable) {
      try {
        restoreBtn.disabled = !localStorage.getItem(BACKUP_STORAGE_KEY);
      } catch (_) {}
    }

    const slugErr = hasDuplicateSlugs();
    if (slugErr) {
      ind.textContent = "BLOCKED // DUPLICATE OR EMPTY SLUG";
      sum.textContent = slugErr;
      saveBtn.disabled = true;
      return;
    }

    const diffs = computeDiffSummary();
    if (diffs.length === 0) {
      ind.textContent = "CLEAN // NO UNSAVED CHANGES";
      sum.textContent = "All changes synced with " + defaultBranch + " branch.";
      saveBtn.disabled = true;
    } else {
      ind.textContent = "DIRTY // UNSAVED CHANGES (" + diffs.length + ")";
      sum.textContent = "Pending commit: " + buildCommitMessage();
      saveBtn.disabled = false;
    }
  }

  function markChanged(reason) {
    if (reason && dirtyReasons.indexOf(reason) === -1) {
      dirtyReasons.push(reason);
    }
    updateSaveBar();
  }

  // --------------------------------------------------------------------------
  // Section Renderers
  // --------------------------------------------------------------------------
  function renderActiveTab() {
    const host = document.getElementById("editorContainer");
    if (!host || !content) return;

    document.querySelectorAll(".admin-tab").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tab") === activeTab);
    });

    if (activeTab === "profile") renderProfileForm(host);
    else if (activeTab === "projects") renderProjectsForm(host);
    else if (activeTab === "experience") renderExperienceForm(host);
    else if (activeTab === "recognition") renderRecognitionForm(host);
    else if (activeTab === "skills") renderSkillsForm(host);
    else if (activeTab === "about") renderAboutForm(host);

    updateSaveBar();
  }

  // 1. PROFILE TAB
  function renderProfileForm(host) {
    const p = content.profile || (content.profile = { links: [] });
    const links = Array.isArray(p.links) ? p.links : (p.links = []);

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>01 // Profile &amp; Contact Links</h2>" +
      '<span class="admin-mono-label">Top-level identity &amp; header links</span>' +
      "</div>" +
      '<div class="admin-grid-2">' +
      '<div class="admin-field"><label>Name</label><input type="text" data-prof="name" value="' +
      esc(p.name) +
      '" /></div>' +
      '<div class="admin-field"><label>Role</label><input type="text" data-prof="role" value="' +
      esc(p.role) +
      '" /></div>' +
      "</div>" +
      '<div class="admin-field"><label>Tagline</label><textarea data-prof="tagline">' +
      esc(p.tagline) +
      "</textarea></div>" +
      '<div class="admin-grid-3">' +
      '<div class="admin-field"><label>Location</label><input type="text" data-prof="location" value="' +
      esc(p.location) +
      '" /></div>' +
      '<div class="admin-field"><label>Status</label><input type="text" data-prof="status" value="' +
      esc(p.status) +
      '" /></div>' +
      '<div class="admin-field"><label>Email</label><input type="email" data-prof="email" value="' +
      esc(p.email) +
      '" /></div>' +
      "</div>" +
      '<div class="admin-card-block">' +
      '<div class="admin-card-block-head">' +
      '<span class="admin-mono-label">Profile Links (Label + URL)</span>' +
      '<button type="button" class="admin-btn admin-btn-sm" id="addProfLinkBtn">+ Add Link</button>' +
      "</div>" +
      links
        .map(function (l, i) {
          return (
            '<div class="admin-inline-row">' +
            '<input type="text" placeholder="Label (e.g. GitHub)" data-prof-link-label="' +
            i +
            '" value="' +
            esc(l.label) +
            '" />' +
            '<input type="text" class="mono-input" placeholder="https://... or resume.pdf" data-prof-link-href="' +
            i +
            '" value="' +
            esc(l.href) +
            '" />' +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-prof-link-del="' +
            i +
            '">Remove</button>' +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }

  // 2. PROJECTS TAB
  function renderProjectsForm(host) {
    const projects = Array.isArray(content.projects)
      ? content.projects
      : (content.projects = []);

    if (selectedProjectIndex >= projects.length) {
      selectedProjectIndex = Math.max(0, projects.length - 1);
    }
    const proj = projects[selectedProjectIndex] || null;

    const listHtml = projects
      .map(function (item, idx) {
        const isSel = idx === selectedProjectIndex;
        return (
          '<div class="admin-proj-row' +
          (isSel ? " is-selected" : "") +
          '" data-select-proj="' +
          idx +
          '">' +
          "<div>" +
          '<span class="admin-proj-row-title">' +
          esc(item.title || "Untitled") +
          "</span>" +
          '<span class="admin-proj-row-slug">' +
          String(idx + 1).padStart(2, "0") +
          " · " +
          esc(item.slug || "no-slug") +
          "</span>" +
          "</div>" +
          '<div class="admin-proj-row-controls">' +
          '<button type="button" class="admin-btn admin-btn-sm" title="Move Up" data-proj-up="' +
          idx +
          '" ' +
          (idx === 0 ? "disabled" : "") +
          ">↑</button>" +
          '<button type="button" class="admin-btn admin-btn-sm" title="Move Down" data-proj-down="' +
          idx +
          '" ' +
          (idx === projects.length - 1 ? "disabled" : "") +
          ">↓</button>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    let detailHtml = "";
    if (!proj) {
      detailHtml = '<p class="admin-mono-label">No projects in content.json. Click + Add Project.</p>';
    } else {
      const slugErr = hasDuplicateSlugs();
      const bodyParas = Array.isArray(proj.body) ? proj.body : (proj.body = []);
      const highlights = Array.isArray(proj.highlights)
        ? proj.highlights
        : (proj.highlights = []);
      const links = Array.isArray(proj.links) ? proj.links : (proj.links = []);
      const media = Array.isArray(proj.media) ? proj.media : (proj.media = []);

      detailHtml =
        '<div class="admin-card-block-head" style="margin-bottom:16px;">' +
        '<span class="admin-mono-label">EDITING PROJECT #' +
        String(selectedProjectIndex + 1).padStart(2, "0") +
        " // " +
        esc(proj.slug) +
        "</span>" +
        '<div style="display:flex; gap:8px;">' +
        '<button type="button" class="admin-btn admin-btn-sm" id="duplicateProjBtn">Duplicate</button>' +
        '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" id="deleteProjBtn">Delete Project</button>' +
        "</div>" +
        "</div>" +
        '<div class="admin-grid-2">' +
        '<div class="admin-field">' +
        "<label>Title</label>" +
        '<input type="text" data-proj-field="title" value="' +
        esc(proj.title) +
        '" />' +
        "</div>" +
        '<div class="admin-field">' +
        "<label>Slug (project.html?p=&lt;slug&gt;)</label>" +
        '<input type="text" class="mono-input" data-proj-field="slug" value="' +
        esc(proj.slug) +
        '" />' +
        (slugErr ? '<span class="admin-field-error">' + esc(slugErr) + "</span>" : "") +
        "</div>" +
        "</div>" +
        '<div class="admin-grid-2">' +
        '<div class="admin-field"><label>Year</label><input type="text" data-proj-field="year" value="' +
        esc(proj.year) +
        '" /></div>' +
        '<div class="admin-field"><label>Role</label><input type="text" data-proj-field="role" value="' +
        esc(proj.role) +
        '" /></div>' +
        "</div>" +
        '<div class="admin-field"><label>Summary (Index card &amp; detail lead)</label><textarea data-proj-field="summary">' +
        esc(proj.summary) +
        "</textarea></div>" +
        '<div class="admin-field">' +
        "<label>Stack (Comma-separated tags)</label>" +
        '<input type="text" data-proj-stack="1" value="' +
        esc((proj.stack || []).join(", ")) +
        '" placeholder="STM32, Timer + DMA, CD4053B, MCP6004" />' +
        "</div>" +
        // Body Paragraphs
        '<div class="admin-card-block">' +
        '<div class="admin-card-block-head">' +
        '<span class="admin-mono-label">Body Paragraphs (' +
        bodyParas.length +
        ")</span>" +
        '<button type="button" class="admin-btn admin-btn-sm" id="addProjBodyBtn">+ Add Paragraph</button>' +
        "</div>" +
        bodyParas
          .map(function (para, pIdx) {
            return (
              '<div class="admin-inline-row" style="align-items:flex-start;">' +
              '<textarea data-proj-body="' +
              pIdx +
              '">' +
              esc(para) +
              "</textarea>" +
              '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-proj-body-del="' +
              pIdx +
              '">×</button>' +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        // Highlights
        '<div class="admin-card-block">' +
        '<div class="admin-card-block-head">' +
        '<span class="admin-mono-label">Bench Highlights &amp; Specs (' +
        highlights.length +
        ")</span>" +
        '<button type="button" class="admin-btn admin-btn-sm" id="addProjHighlightBtn">+ Add Highlight</button>' +
        "</div>" +
        highlights
          .map(function (h, hIdx) {
            return (
              '<div class="admin-inline-row">' +
              '<input type="text" data-proj-highlight="' +
              hIdx +
              '" value="' +
              esc(h) +
              '" />' +
              '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-proj-highlight-del="' +
              hIdx +
              '">×</button>' +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        // Links
        '<div class="admin-card-block">' +
        '<div class="admin-card-block-head">' +
        '<span class="admin-mono-label">External Links (' +
        links.length +
        ")</span>" +
        '<button type="button" class="admin-btn admin-btn-sm" id="addProjLinkBtn">+ Add Link</button>' +
        "</div>" +
        links
          .map(function (l, lIdx) {
            return (
              '<div class="admin-inline-row">' +
              '<input type="text" placeholder="Label" data-proj-link-label="' +
              lIdx +
              '" value="' +
              esc(l.label) +
              '" />' +
              '<input type="text" class="mono-input" placeholder="https://..." data-proj-link-href="' +
              lIdx +
              '" value="' +
              esc(l.href) +
              '" />' +
              '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-proj-link-del="' +
              lIdx +
              '">×</button>' +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        // Media / Photo Upload
        '<div class="admin-card-block">' +
        '<div class="admin-card-block-head">' +
        '<span class="admin-mono-label">Photos &amp; Media (' +
        media.length +
        ') — Commits to images/' +
        esc(proj.slug || "project") +
        "/</span>" +
        "</div>" +
        '<div class="admin-dropzone" id="mediaDropzone">' +
        '<div class="admin-mono-label" style="color:var(--accent);">Drag &amp; drop photos here or click to select files</div>' +
        '<p style="font-size:12.5px; color:var(--ink-2); margin:6px 0 0;">Client-side canvas resizes to max 1600px JPEG (quality 0.82 → 0.60, &lt;300 KB) and commits straight to GitHub.</p>' +
        '<input type="file" id="mediaFileInput" accept="image/jpeg,image/png,image/webp,image/heic,image/*" multiple hidden />' +
        "</div>" +
        '<div class="admin-media-grid" id="mediaGrid">' +
        media
          .map(function (m, mIdx) {
            const thumbSrc = m._localPreview || m.src || "";
            return (
              '<div class="admin-media-item">' +
              '<div class="admin-media-thumb">' +
              (thumbSrc
                ? '<img src="' + esc(thumbSrc) + '" alt="' + esc(m.caption || proj.title) + '" />'
                : '<span class="admin-mono-label">EMPTY FRAME</span>') +
              (m._uploading
                ? '<div class="admin-media-spinner">Uploading to GitHub...</div>'
                : "") +
              "</div>" +
              '<div class="admin-media-meta">' +
              '<div class="admin-media-path">' +
              esc(m.src || "(no image file)") +
              "</div>" +
              '<input type="text" placeholder="Caption..." data-proj-media-caption="' +
              mIdx +
              '" value="' +
              esc(m.caption || "") +
              '" />' +
              '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-proj-media-del="' +
              mIdx +
              '">Remove</button>' +
              "</div>" +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        "</div>";
    }

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>02 // Projects (" +
      projects.length +
      ")</h2>" +
      '<button type="button" class="admin-btn admin-btn-accent" id="addNewProjBtn">+ Add Project</button>' +
      "</div>" +
      '<div class="admin-projects-layout">' +
      '<div class="admin-proj-list">' +
      listHtml +
      "</div>" +
      '<div class="admin-proj-detail">' +
      detailHtml +
      "</div>" +
      "</div>";
  }

  // 3. EXPERIENCE TAB
  function renderExperienceForm(host) {
    const list = Array.isArray(content.experience)
      ? content.experience
      : (content.experience = []);

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>03 // Experience &amp; Education (" +
      list.length +
      ")</h2>" +
      '<button type="button" class="admin-btn admin-btn-accent" id="addExpBtn">+ Add Entry</button>' +
      "</div>" +
      list
        .map(function (item, idx) {
          const highlights = Array.isArray(item.highlights)
            ? item.highlights
            : (item.highlights = []);
          return (
            '<div class="admin-card-block">' +
            '<div class="admin-card-block-head">' +
            '<span class="admin-mono-label">ENTRY #' +
            (idx + 1) +
            " // " +
            esc(item.org || "Organization") +
            "</span>" +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-exp-del="' +
            idx +
            '">Delete Entry</button>' +
            "</div>" +
            '<div class="admin-grid-2">' +
            '<div class="admin-field"><label>Role / Degree</label><input type="text" data-exp-field="' +
            idx +
            ':role" value="' +
            esc(item.role) +
            '" /></div>' +
            '<div class="admin-field"><label>Organization / Institute</label><input type="text" data-exp-field="' +
            idx +
            ':org" value="' +
            esc(item.org) +
            '" /></div>' +
            "</div>" +
            '<div class="admin-grid-2">' +
            '<div class="admin-field"><label>Period</label><input type="text" data-exp-field="' +
            idx +
            ':period" value="' +
            esc(item.period) +
            '" /></div>' +
            '<div class="admin-field"><label>Location</label><input type="text" data-exp-field="' +
            idx +
            ':location" value="' +
            esc(item.location) +
            '" /></div>' +
            "</div>" +
            '<div class="admin-field"><label>Summary</label><textarea data-exp-field="' +
            idx +
            ':summary">' +
            esc(item.summary) +
            "</textarea></div>" +
            '<div class="admin-field"><label>Highlights (One line per bullet)</label><textarea data-exp-highlights="' +
            idx +
            '">' +
            esc(highlights.join("\n")) +
            "</textarea></div>" +
            '<div class="admin-field"><label>Tags (Comma-separated)</label><input type="text" data-exp-tags="' +
            idx +
            '" value="' +
            esc((item.tags || []).join(", ")) +
            '" /></div>' +
            "</div>"
          );
        })
        .join("");
  }

  // 4. RECOGNITION TAB
  function renderRecognitionForm(host) {
    const list = Array.isArray(content.recognition)
      ? content.recognition
      : (content.recognition = []);

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>04 // Recognition &amp; Reports (" +
      list.length +
      ")</h2>" +
      '<button type="button" class="admin-btn admin-btn-accent" id="addRecBtn">+ Add Recognition</button>' +
      "</div>" +
      list
        .map(function (r, idx) {
          const link = r.link || (r.link = { label: "", href: "" });
          return (
            '<div class="admin-card-block">' +
            '<div class="admin-card-block-head">' +
            '<span class="admin-mono-label">ITEM #' +
            (idx + 1) +
            " // " +
            esc(r.title || "Recognition") +
            "</span>" +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-rec-del="' +
            idx +
            '">Delete</button>' +
            "</div>" +
            '<div class="admin-grid-3">' +
            '<div class="admin-field"><label>Kind (Award, Publication...)</label><input type="text" data-rec-field="' +
            idx +
            ':kind" value="' +
            esc(r.kind) +
            '" /></div>' +
            '<div class="admin-field"><label>Date</label><input type="text" data-rec-field="' +
            idx +
            ':date" value="' +
            esc(r.date) +
            '" /></div>' +
            '<div class="admin-field"><label>Organization</label><input type="text" data-rec-field="' +
            idx +
            ':org" value="' +
            esc(r.org) +
            '" /></div>' +
            "</div>" +
            '<div class="admin-field"><label>Title</label><input type="text" data-rec-field="' +
            idx +
            ':title" value="' +
            esc(r.title) +
            '" /></div>' +
            '<div class="admin-field"><label>Note</label><textarea data-rec-field="' +
            idx +
            ':note">' +
            esc(r.note) +
            "</textarea></div>" +
            '<div class="admin-grid-2">' +
            '<div class="admin-field"><label>Link Label (Optional)</label><input type="text" data-rec-link="' +
            idx +
            ':label" value="' +
            esc(link.label) +
            '" /></div>' +
            '<div class="admin-field"><label>Link URL (Optional)</label><input type="text" class="mono-input" data-rec-link="' +
            idx +
            ':href" value="' +
            esc(link.href) +
            '" /></div>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
  }

  // 5. SKILLS TAB
  function renderSkillsForm(host) {
    const groups = Array.isArray(content.skills)
      ? content.skills
      : (content.skills = []);

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>05 // Skills &amp; Capability Groups (" +
      groups.length +
      ")</h2>" +
      '<button type="button" class="admin-btn admin-btn-accent" id="addSkillGroupBtn">+ Add Skill Group</button>' +
      "</div>" +
      groups
        .map(function (g, gIdx) {
          const items = Array.isArray(g.items) ? g.items : (g.items = []);
          return (
            '<div class="admin-card-block">' +
            '<div class="admin-card-block-head">' +
            '<input type="text" style="font-weight:600; max-width:260px;" data-skill-group="' +
            gIdx +
            '" value="' +
            esc(g.group) +
            '" />' +
            '<div style="display:flex; gap:6px;">' +
            '<button type="button" class="admin-btn admin-btn-sm" data-skill-add-item="' +
            gIdx +
            '">+ Add Skill</button>' +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-skill-del-group="' +
            gIdx +
            '">Delete Group</button>' +
            "</div>" +
            "</div>" +
            items
              .map(function (it, iIdx) {
                return (
                  '<div class="admin-inline-row">' +
                  '<input type="text" placeholder="Skill name" data-skill-name="' +
                  gIdx +
                  ":" +
                  iIdx +
                  '" value="' +
                  esc(it.name) +
                  '" />' +
                  '<select data-skill-level="' +
                  gIdx +
                  ":" +
                  iIdx +
                  '" style="max-width:170px;">' +
                  ["Advanced", "Intermediate", "Working"]
                    .map(function (lvl) {
                      return (
                        '<option value="' +
                        lvl +
                        '"' +
                        (it.level === lvl ? " selected" : "") +
                        ">" +
                        lvl +
                        "</option>"
                      );
                    })
                    .join("") +
                  "</select>" +
                  '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-skill-del-item="' +
                  gIdx +
                  ":" +
                  iIdx +
                  '">×</button>' +
                  "</div>"
                );
              })
              .join("") +
            "</div>"
          );
        })
        .join("");
  }

  // 6. ABOUT TAB
  function renderAboutForm(host) {
    const ab = content.about || (content.about = { paragraphs: [], now: [] });
    const paras = Array.isArray(ab.paragraphs)
      ? ab.paragraphs
      : (ab.paragraphs = []);
    const nowRows = Array.isArray(ab.now) ? ab.now : (ab.now = []);

    host.innerHTML =
      '<div class="admin-section-header">' +
      "<h2>06 // About &amp; Bench Status</h2>" +
      "</div>" +
      '<div class="admin-card-block">' +
      '<div class="admin-card-block-head">' +
      '<span class="admin-mono-label">Bio Paragraphs (' +
      paras.length +
      ")</span>" +
      '<button type="button" class="admin-btn admin-btn-sm" id="addAboutParaBtn">+ Add Paragraph</button>' +
      "</div>" +
      paras
        .map(function (p, idx) {
          return (
            '<div class="admin-inline-row" style="align-items:flex-start;">' +
            '<textarea data-about-para="' +
            idx +
            '">' +
            esc(p) +
            "</textarea>" +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-about-para-del="' +
            idx +
            '">×</button>' +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="admin-card-block">' +
      '<div class="admin-card-block-head">' +
      '<span class="admin-mono-label">Now / Bench Status Rows (' +
      nowRows.length +
      ")</span>" +
      '<button type="button" class="admin-btn admin-btn-sm" id="addAboutNowBtn">+ Add Row</button>' +
      "</div>" +
      nowRows
        .map(function (row, idx) {
          return (
            '<div class="admin-inline-row">' +
            '<input type="text" placeholder="Label (e.g. Current focus)" data-about-now-label="' +
            idx +
            '" value="' +
            esc(row.label) +
            '" style="max-width:220px;" />' +
            '<input type="text" placeholder="Value" data-about-now-val="' +
            idx +
            '" value="' +
            esc(row.value) +
            '" />' +
            '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-about-now-del="' +
            idx +
            '">×</button>' +
            "</div>"
          );
        })
        .join("") +
      "</div>";
  }

  // --------------------------------------------------------------------------
  // Image Upload Flow for Current Project
  // --------------------------------------------------------------------------
  async function handleFilesForCurrentProject(fileList) {
    if (!content || !Array.isArray(content.projects)) return;
    const proj = content.projects[selectedProjectIndex];
    if (!proj) return;

    const cleanSlug = slugify(proj.slug || proj.title || "project");
    if (!cleanSlug) {
      showNotice("Set a valid project slug before uploading images.", "error");
      return;
    }

    const files = Array.from(fileList || []);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let compressed;
      try {
        compressed = await compressImageToJpegBase64(file);
      } catch (err) {
        showNotice(err.message || "Failed to compress image", "error");
        continue;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const repoPath =
        "images/" + cleanSlug + "/" + timestamp + "-" + compressed.safeFilename;

      // Append immediately with local objectURL preview and uploading spinner
      const mediaEntry = {
        src: repoPath,
        caption: "",
        _localPreview: compressed.objectUrl,
        _uploading: true
      };
      proj.media = Array.isArray(proj.media) ? proj.media : [];
      proj.media.push(mediaEntry);
      renderActiveTab();

      try {
        await putNewBinaryImage(
          repoPath,
          compressed.base64,
          proj.title || cleanSlug
        );
        delete mediaEntry._uploading;
        unreferencedUploads.push(repoPath);
        markChanged("images: add photo to " + (proj.title || cleanSlug));
        showNotice(
          "Uploaded " +
            repoPath +
            " (" +
            compressed.sizeKB +
            " KB JPEG). Set a caption below, then press Save to GitHub to reference it in content.json.",
          "ok"
        );
        renderActiveTab();
      } catch (uploadErr) {
        // Remove failed entry
        const idx = proj.media.indexOf(mediaEntry);
        if (idx !== -1) proj.media.splice(idx, 1);
        renderActiveTab();
        showNotice(
          "Image upload failed: " + (uploadErr.message || "network error"),
          "error"
        );
      }
    }
  }

  // Clean temporary UI properties (_localPreview, _uploading) before serializing content.json
  function serializeCleanContent() {
    const clone = JSON.parse(JSON.stringify(content));
    if (Array.isArray(clone.projects)) {
      clone.projects.forEach(function (p) {
        if (Array.isArray(p.media)) {
          p.media.forEach(function (m) {
            delete m._localPreview;
            delete m._uploading;
          });
        }
      });
    }
    return JSON.stringify(clone, null, 2) + "\n";
  }

  // --------------------------------------------------------------------------
  // Connect / Unlock Flow
  // --------------------------------------------------------------------------
  async function connectWithToken(rawToken) {
    const statusEl = document.getElementById("authStatus");
    const connectBtn = document.getElementById("connectBtn");
    const tokenInput = document.getElementById("tokenInput");

    if (rawToken !== undefined) {
      setToken(rawToken.trim());
    }
    if (!getToken()) {
      statusEl.textContent = "Enter a fine-grained Personal Access Token.";
      statusEl.className = "admin-status-msg is-error";
      return;
    }

    connectBtn.disabled = true;
    statusEl.textContent = "Verifying token against GitHub REST API...";
    statusEl.className = "admin-status-msg";

    try {
      const repoInfo = await verifyRepoAccess();
      const loaded = await fetchRemoteContentJson();

      content = loaded.parsed;
      originalContentJson = serializeCleanContent();

      // Mask token strictly as ••••
      if (tokenInput) tokenInput.value = "••••";

      // Unlock UI
      document.getElementById("authSection").hidden = true;
      document.getElementById("workspaceSection").hidden = false;
      document.getElementById("forgetTokenBtn").hidden = false;

      const badge = document.getElementById("repoBadge");
      badge.hidden = false;
      badge.textContent = repoInfo.fullName + " (" + repoInfo.defaultBranch + ")";

      if (!storageAvailable) {
        showNotice(
          "localStorage is unavailable in this browser; session is running in-memory only.",
          "error"
        );
      } else {
        showNotice("", "");
      }

      renderActiveTab();
    } catch (err) {
      clearToken();
      if (tokenInput) tokenInput.value = "";
      statusEl.textContent = err.message || "Connection failed.";
      statusEl.className = "admin-status-msg is-error";
    } finally {
      connectBtn.disabled = false;
    }
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();

    const authForm = document.getElementById("authForm");
    if (authForm) {
      authForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const input = document.getElementById("tokenInput");
        const val = input ? input.value.trim() : "";
        if (val && val !== "••••") {
          connectWithToken(val);
        } else if (getToken()) {
          connectWithToken(getToken());
        }
      });
    }

    const forgetBtn = document.getElementById("forgetTokenBtn");
    if (forgetBtn) {
      forgetBtn.addEventListener("click", function () {
        clearToken();
        content = null;
        originalContentJson = "";
        document.getElementById("workspaceSection").hidden = true;
        document.getElementById("authSection").hidden = false;
        document.getElementById("repoBadge").hidden = true;
        forgetBtn.hidden = true;
        const input = document.getElementById("tokenInput");
        if (input) input.value = "";
        const statusEl = document.getElementById("authStatus");
        if (statusEl) {
          statusEl.textContent = "Token forgotten from this browser.";
          statusEl.className = "admin-status-msg";
        }
      });
    }

    // Tab switching
    document.querySelectorAll(".admin-tab").forEach(function (tabBtn) {
      tabBtn.addEventListener("click", function () {
        activeTab = tabBtn.getAttribute("data-tab") || "profile";
        renderActiveTab();
      });
    });

    // Save to GitHub
    const saveBtn = document.getElementById("saveToGithubBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async function () {
        if (!content) return;
        const slugErr = hasDuplicateSlugs();
        if (slugErr) {
          showNotice(slugErr, "error");
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = "Committing...";
        const commitMsg = buildCommitMessage();
        const previousSnapshot = originalContentJson;
        const nextJson = serializeCleanContent();

        try {
          await putContentJsonWithRetry(nextJson, commitMsg);
          // Save previous content.json in localStorage on every successful save
          if (storageAvailable && previousSnapshot) {
            try {
              localStorage.setItem(BACKUP_STORAGE_KEY, previousSnapshot);
            } catch (_) {}
          }
          originalContentJson = nextJson;
          dirtyReasons = [];
          unreferencedUploads = [];
          showNotice(
            "Committed. GitHub Pages rebuilds in about a minute — hard-refresh the site to see it.",
            "ok"
          );
          updateSaveBar();
        } catch (err) {
          let errMsg = "Failed to save content.json: " + (err.message || "error");
          if (unreferencedUploads.length > 0) {
            errMsg +=
              " WARNING: Uploaded image(s) [" +
              unreferencedUploads.join(", ") +
              "] are committed in the repo but not yet referenced in content.json. Press Save to GitHub again so they are not orphaned.";
          }
          showNotice(errMsg, "error");
        } finally {
          saveBtn.textContent = "Save to GitHub";
          updateSaveBar();
        }
      });
    }

    // Restore last local backup
    const restoreBtn = document.getElementById("restoreBackupBtn");
    if (restoreBtn) {
      restoreBtn.addEventListener("click", function () {
        if (!storageAvailable) return;
        const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (!raw) {
          showNotice("No local backup found in localStorage.", "error");
          return;
        }
        try {
          content = JSON.parse(raw);
          markChanged("restore local backup");
          renderActiveTab();
          showNotice(
            "Restored last local backup into the form. Review and press Save to GitHub to publish.",
            "ok"
          );
        } catch (e) {
          showNotice("Local backup JSON could not be parsed.", "error");
        }
      });
    }

    // Reload from GitHub
    const reloadBtn = document.getElementById("reloadRemoteBtn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", async function () {
        try {
          const loaded = await fetchRemoteContentJson();
          content = loaded.parsed;
          originalContentJson = serializeCleanContent();
          dirtyReasons = [];
          renderActiveTab();
          showNotice("Reloaded latest content.json from GitHub.", "ok");
        } catch (err) {
          showNotice(err.message || "Could not reload content.json", "error");
        }
      });
    }

    // Delegated Clicks inside Editor Container
    const editor = document.getElementById("editorContainer");
    editor.addEventListener("click", function (e) {
      const t = e.target;

      // Profile Links
      if (t.id === "addProfLinkBtn") {
        content.profile.links.push({ label: "", href: "" });
        markChanged("update Profile");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-prof-link-del")) {
        const idx = Number(t.getAttribute("data-prof-link-del"));
        content.profile.links.splice(idx, 1);
        markChanged("update Profile");
        renderActiveTab();
        return;
      }

      // Project Selection & Reordering
      const upBtn = t.closest("[data-proj-up]");
      if (upBtn) {
        e.stopPropagation();
        const idx = Number(upBtn.getAttribute("data-proj-up"));
        if (idx > 0) {
          const arr = content.projects;
          const tmp = arr[idx - 1];
          arr[idx - 1] = arr[idx];
          arr[idx] = tmp;
          selectedProjectIndex = idx - 1;
          markChanged("reorder projects");
          renderActiveTab();
        }
        return;
      }
      const downBtn = t.closest("[data-proj-down]");
      if (downBtn) {
        e.stopPropagation();
        const idx = Number(downBtn.getAttribute("data-proj-down"));
        const arr = content.projects;
        if (idx < arr.length - 1) {
          const tmp = arr[idx + 1];
          arr[idx + 1] = arr[idx];
          arr[idx] = tmp;
          selectedProjectIndex = idx + 1;
          markChanged("reorder projects");
          renderActiveTab();
        }
        return;
      }
      const selRow = t.closest("[data-select-proj]");
      if (selRow) {
        selectedProjectIndex = Number(selRow.getAttribute("data-select-proj"));
        renderActiveTab();
        return;
      }

      // Add / Duplicate / Delete Project
      if (t.id === "addNewProjBtn") {
        const newProj = {
          slug: "new-project",
          title: "New Project",
          summary: "",
          year: String(new Date().getFullYear()),
          role: "",
          stack: [],
          body: [""],
          highlights: [],
          links: [],
          media: [],
          _autoSlug: true
        };
        content.projects.unshift(newProj);
        selectedProjectIndex = 0;
        markChanged("add project");
        renderActiveTab();
        return;
      }
      if (t.id === "duplicateProjBtn") {
        const orig = content.projects[selectedProjectIndex];
        if (orig) {
          const copy = JSON.parse(JSON.stringify(orig));
          copy.title = (orig.title || "Project") + " (Copy)";
          copy.slug = slugify(orig.slug + "-copy");
          content.projects.splice(selectedProjectIndex + 1, 0, copy);
          selectedProjectIndex += 1;
          markChanged("duplicate " + orig.title);
          renderActiveTab();
        }
        return;
      }
      if (t.id === "deleteProjBtn") {
        const removed = content.projects.splice(selectedProjectIndex, 1)[0];
        selectedProjectIndex = Math.max(
          0,
          Math.min(selectedProjectIndex, content.projects.length - 1)
        );
        markChanged("delete " + (removed ? removed.title : "project"));
        renderActiveTab();
        return;
      }

      // Project Body, Highlights, Links, Media
      const proj = content.projects && content.projects[selectedProjectIndex];
      if (proj) {
        if (t.id === "addProjBodyBtn") {
          proj.body.push("");
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.hasAttribute("data-proj-body-del")) {
          proj.body.splice(Number(t.getAttribute("data-proj-body-del")), 1);
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.id === "addProjHighlightBtn") {
          proj.highlights.push("");
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.hasAttribute("data-proj-highlight-del")) {
          proj.highlights.splice(
            Number(t.getAttribute("data-proj-highlight-del")),
            1
          );
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.id === "addProjLinkBtn") {
          proj.links.push({ label: "", href: "" });
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.hasAttribute("data-proj-link-del")) {
          proj.links.splice(Number(t.getAttribute("data-proj-link-del")), 1);
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.hasAttribute("data-proj-media-del")) {
          proj.media.splice(Number(t.getAttribute("data-proj-media-del")), 1);
          markChanged("update " + proj.title);
          renderActiveTab();
          return;
        }
        if (t.closest("#mediaDropzone")) {
          const fileInput = document.getElementById("mediaFileInput");
          if (fileInput && t !== fileInput) fileInput.click();
          return;
        }
      }

      // Experience
      if (t.id === "addExpBtn") {
        content.experience.unshift({
          role: "",
          org: "",
          period: "",
          location: "",
          summary: "",
          highlights: [],
          tags: []
        });
        markChanged("update Experience");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-exp-del")) {
        content.experience.splice(Number(t.getAttribute("data-exp-del")), 1);
        markChanged("update Experience");
        renderActiveTab();
        return;
      }

      // Recognition
      if (t.id === "addRecBtn") {
        content.recognition.unshift({
          kind: "Award",
          date: String(new Date().getFullYear()),
          title: "",
          org: "",
          note: "",
          link: { label: "", href: "" }
        });
        markChanged("update Recognition");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-rec-del")) {
        content.recognition.splice(Number(t.getAttribute("data-rec-del")), 1);
        markChanged("update Recognition");
        renderActiveTab();
        return;
      }

      // Skills
      if (t.id === "addSkillGroupBtn") {
        content.skills.push({
          group: "New Group",
          items: [{ name: "", level: "Intermediate" }]
        });
        markChanged("update Skills");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-skill-add-item")) {
        const gIdx = Number(t.getAttribute("data-skill-add-item"));
        content.skills[gIdx].items.push({ name: "", level: "Intermediate" });
        markChanged("update Skills");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-skill-del-group")) {
        const gIdx = Number(t.getAttribute("data-skill-del-group"));
        content.skills.splice(gIdx, 1);
        markChanged("update Skills");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-skill-del-item")) {
        const parts = t.getAttribute("data-skill-del-item").split(":");
        content.skills[Number(parts[0])].items.splice(Number(parts[1]), 1);
        markChanged("update Skills");
        renderActiveTab();
        return;
      }

      // About
      if (t.id === "addAboutParaBtn") {
        content.about.paragraphs.push("");
        markChanged("update About");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-about-para-del")) {
        content.about.paragraphs.splice(
          Number(t.getAttribute("data-about-para-del")),
          1
        );
        markChanged("update About");
        renderActiveTab();
        return;
      }
      if (t.id === "addAboutNowBtn") {
        content.about.now.push({ label: "", value: "" });
        markChanged("update About");
        renderActiveTab();
        return;
      }
      if (t.hasAttribute("data-about-now-del")) {
        content.about.now.splice(Number(t.getAttribute("data-about-now-del")), 1);
        markChanged("update About");
        renderActiveTab();
        return;
      }
    });

    // Delegated Input Changes inside Editor Container
    editor.addEventListener("input", function (e) {
      const t = e.target;
      if (!content) return;

      // Profile fields
      if (t.hasAttribute("data-prof")) {
        const key = t.getAttribute("data-prof");
        content.profile[key] = t.value;
        markChanged("update Profile");
        return;
      }
      if (t.hasAttribute("data-prof-link-label")) {
        const idx = Number(t.getAttribute("data-prof-link-label"));
        content.profile.links[idx].label = t.value;
        markChanged("update Profile");
        return;
      }
      if (t.hasAttribute("data-prof-link-href")) {
        const idx = Number(t.getAttribute("data-prof-link-href"));
        content.profile.links[idx].href = t.value;
        markChanged("update Profile");
        return;
      }

      // Project fields
      const proj = content.projects && content.projects[selectedProjectIndex];
      if (proj) {
        if (t.hasAttribute("data-proj-field")) {
          const field = t.getAttribute("data-proj-field");
          if (field === "title") {
            proj.title = t.value;
            if (proj._autoSlug) {
              proj.slug = slugify(t.value);
              const slugInp = editor.querySelector('[data-proj-field="slug"]');
              if (slugInp) slugInp.value = proj.slug;
            }
          } else if (field === "slug") {
            proj._autoSlug = false;
            proj.slug = slugify(t.value);
          } else {
            proj[field] = t.value;
          }
          markChanged("update " + (proj.title || proj.slug));
          return;
        }
        if (t.hasAttribute("data-proj-stack")) {
          proj.stack = t.value
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          markChanged("update " + proj.title);
          return;
        }
        if (t.hasAttribute("data-proj-body")) {
          const idx = Number(t.getAttribute("data-proj-body"));
          proj.body[idx] = t.value;
          markChanged("update " + proj.title);
          return;
        }
        if (t.hasAttribute("data-proj-highlight")) {
          const idx = Number(t.getAttribute("data-proj-highlight"));
          proj.highlights[idx] = t.value;
          markChanged("update " + proj.title);
          return;
        }
        if (t.hasAttribute("data-proj-link-label")) {
          const idx = Number(t.getAttribute("data-proj-link-label"));
          proj.links[idx].label = t.value;
          markChanged("update " + proj.title);
          return;
        }
        if (t.hasAttribute("data-proj-link-href")) {
          const idx = Number(t.getAttribute("data-proj-link-href"));
          proj.links[idx].href = t.value;
          markChanged("update " + proj.title);
          return;
        }
        if (t.hasAttribute("data-proj-media-caption")) {
          const idx = Number(t.getAttribute("data-proj-media-caption"));
          if (proj.media[idx]) proj.media[idx].caption = t.value;
          markChanged("update " + proj.title);
          return;
        }
      }

      // Experience fields
      if (t.hasAttribute("data-exp-field")) {
        const parts = t.getAttribute("data-exp-field").split(":");
        content.experience[Number(parts[0])][parts[1]] = t.value;
        markChanged("update Experience");
        return;
      }
      if (t.hasAttribute("data-exp-highlights")) {
        const idx = Number(t.getAttribute("data-exp-highlights"));
        content.experience[idx].highlights = t.value
          .split("\n")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
        markChanged("update Experience");
        return;
      }
      if (t.hasAttribute("data-exp-tags")) {
        const idx = Number(t.getAttribute("data-exp-tags"));
        content.experience[idx].tags = t.value
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
        markChanged("update Experience");
        return;
      }

      // Recognition fields
      if (t.hasAttribute("data-rec-field")) {
        const parts = t.getAttribute("data-rec-field").split(":");
        content.recognition[Number(parts[0])][parts[1]] = t.value;
        markChanged("update Recognition");
        return;
      }
      if (t.hasAttribute("data-rec-link")) {
        const parts = t.getAttribute("data-rec-link").split(":");
        const item = content.recognition[Number(parts[0])];
        item.link = item.link || { label: "", href: "" };
        item.link[parts[1]] = t.value;
        markChanged("update Recognition");
        return;
      }

      // Skills fields
      if (t.hasAttribute("data-skill-group")) {
        const gIdx = Number(t.getAttribute("data-skill-group"));
        content.skills[gIdx].group = t.value;
        markChanged("update Skills");
        return;
      }
      if (t.hasAttribute("data-skill-name")) {
        const parts = t.getAttribute("data-skill-name").split(":");
        content.skills[Number(parts[0])].items[Number(parts[1])].name = t.value;
        markChanged("update Skills");
        return;
      }
      if (t.hasAttribute("data-skill-level")) {
        const parts = t.getAttribute("data-skill-level").split(":");
        content.skills[Number(parts[0])].items[Number(parts[1])].level = t.value;
        markChanged("update Skills");
        return;
      }

      // About fields
      if (t.hasAttribute("data-about-para")) {
        const idx = Number(t.getAttribute("data-about-para"));
        content.about.paragraphs[idx] = t.value;
        markChanged("update About");
        return;
      }
      if (t.hasAttribute("data-about-now-label")) {
        const idx = Number(t.getAttribute("data-about-now-label"));
        content.about.now[idx].label = t.value;
        markChanged("update About");
        return;
      }
      if (t.hasAttribute("data-about-now-val")) {
        const idx = Number(t.getAttribute("data-about-now-val"));
        content.about.now[idx].value = t.value;
        markChanged("update About");
        return;
      }
    });

    // File input change for media upload
    editor.addEventListener("change", function (e) {
      if (e.target && e.target.id === "mediaFileInput") {
        handleFilesForCurrentProject(e.target.files);
        e.target.value = "";
      }
    });

    // Drag and drop on #mediaDropzone
    editor.addEventListener("dragover", function (e) {
      const dz = e.target.closest("#mediaDropzone");
      if (dz) {
        e.preventDefault();
        dz.classList.add("is-dragover");
      }
    });
    editor.addEventListener("dragleave", function (e) {
      const dz = e.target.closest("#mediaDropzone");
      if (dz) dz.classList.remove("is-dragover");
    });
    editor.addEventListener("drop", function (e) {
      const dz = e.target.closest("#mediaDropzone");
      if (!dz) return;
      e.preventDefault();
      dz.classList.remove("is-dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFilesForCurrentProject(e.dataTransfer.files);
      }
    });

    // Auto-connect on load if token already stored in localStorage
    const savedTok = getToken();
    if (savedTok) {
      const input = document.getElementById("tokenInput");
      if (input) input.value = "••••";
      connectWithToken(savedTok);
    }
  });
})();
