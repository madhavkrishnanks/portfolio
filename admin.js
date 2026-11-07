/* ==================================================================
   admin.js — Portfolio Admin Studio & GitHub API Sync
   ================================================================== */

(function () {
  "use strict";

  const REPO_OWNER = "madhavkrishnanks";
  const REPO_NAME = "portfolio";
  const REPO_BRANCH = "main";
  const VAULT_STORAGE_KEY = "portfolio_auth_vault";
  const PREVIEW_STORAGE_KEY = "portfolio_preview_draft";

  // Application State
  let sessionToken = null;
  let workingData = null;
  let stagedPhotos = []; // Photos to be committed on publish: [{ filename, base64, projectIndex, mediaIndex }]
  let unsavedChanges = false;

  /* ---------- Helpers: Encoding & Byte Conversion ---------- */

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    return arrayBufferToBase64(bytes.buffer);
  }

  function base64ToUtf8(base64) {
    const buffer = base64ToArrayBuffer(base64);
    return new TextDecoder().decode(buffer);
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /* ---------- Web Cryptography (PBKDF2 + AES-256-GCM) ---------- */

  const CryptoManager = {
    isConfigured() {
      return !!localStorage.getItem(VAULT_STORAGE_KEY);
    },

    async deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      return window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    },

    async setup(password, token) {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await this.deriveKey(password, salt);
      const enc = new TextEncoder();
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(token)
      );

      const vault = {
        salt: arrayBufferToBase64(salt),
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertext)
      };

      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
      sessionToken = token;
      return true;
    },

    async unlock(password) {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!raw) return false;

      try {
        const vault = JSON.parse(raw);
        const salt = new Uint8Array(base64ToArrayBuffer(vault.salt));
        const iv = new Uint8Array(base64ToArrayBuffer(vault.iv));
        const ciphertext = base64ToArrayBuffer(vault.ciphertext);

        const key = await this.deriveKey(password, salt);
        const decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          key,
          ciphertext
        );

        sessionToken = new TextDecoder().decode(decrypted);
        return true;
      } catch (err) {
        console.error("Decryption failed:", err);
        return false;
      }
    },

    lock() {
      sessionToken = null;
    },

    reset() {
      localStorage.removeItem(VAULT_STORAGE_KEY);
      sessionToken = null;
    }
  };

  /* ---------- High-Fidelity Image Processing (2048px Bicubic) ---------- */

  const ImageProcessor = {
    async process(file, maxDim = 2048, quality = 0.90) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.onload = (e) => {
          const img = new Image();
          img.onerror = () => reject(new Error("Invalid image format"));
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Scale down to maxDim only if larger, keeping pristine aspect ratio
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            // Enable maximum bicubic smoothing for sharp traces and clear silkscreen text
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            // Export as WebP with high quality (0.90), fallback to JPEG
            let format = "image/webp";
            let ext = "webp";
            let dataUrl = canvas.toDataURL(format, quality);

            if (!dataUrl.startsWith("data:image/webp")) {
              format = "image/jpeg";
              ext = "jpg";
              dataUrl = canvas.toDataURL(format, quality);
            }

            const base64 = dataUrl.split(",")[1];
            const cleanBase = slugify(file.name.replace(/\.[^.]+$/, ""));
            const filename = `${cleanBase}-${Date.now()}.${ext}`;

            resolve({
              filename: filename,
              dataUrl: dataUrl,
              base64: base64,
              width: width,
              height: height,
              originalSize: file.size,
              compressedSize: Math.round((base64.length * 3) / 4)
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  /* ---------- GitHub API Client ---------- */

  const GitHubClient = {
    async request(endpoint, options = {}) {
      if (!sessionToken) throw new Error("No active session token");

      const url = `https://api.github.com${endpoint}`;
      const headers = {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${sessionToken}`,
        ...options.headers
      };

      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        let errorData = {};
        try {
          errorData = await res.json();
        } catch (_) {}
        const msg = errorData.message || `GitHub API error (${res.status})`;
        const error = new Error(msg);
        error.status = res.status;
        throw error;
      }

      return res.json();
    },

    async verifyToken() {
      const user = await this.request("/user");
      return user;
    },

    async getFile(path) {
      try {
        const data = await this.request(
          `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`
        );
        return {
          sha: data.sha,
          content: base64ToUtf8(data.content.replace(/\s/g, ""))
        };
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },

    async commitFile(path, contentBase64, message, sha = null) {
      const body = {
        message: message,
        content: contentBase64,
        branch: REPO_BRANCH
      };
      if (sha) body.sha = sha;

      return this.request(
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );
    }
  };

  /* ---------- Data Serialization ---------- */

  function cleanDataForExport(data) {
    const clean = JSON.parse(JSON.stringify(data));
    (clean.PROJECTS || []).forEach(p => {
      (p.media || []).forEach(m => {
        if (m && m.previewUrl) delete m.previewUrl;
      });
    });
    (clean.CUSTOM_SECTIONS || []).forEach(s => {
      (s.items || []).forEach(it => {
        (it.media || []).forEach(m => {
          if (m && m.previewUrl) delete m.previewUrl;
        });
      });
    });
    return clean;
  }

  function serializeDataJs(data) {
    const clean = cleanDataForExport(data);
    return `/* ------------------------------------------------------------------
   SITE CONTENT — Updated via Portfolio Admin Studio
   ------------------------------------------------------------------ */

const PROFILE = ${JSON.stringify(clean.PROFILE, null, 2)};

const PROJECTS = ${JSON.stringify(clean.PROJECTS, null, 2)};

const EXPERIENCE = ${JSON.stringify(clean.EXPERIENCE, null, 2)};

const RECOGNITION = ${JSON.stringify(clean.RECOGNITION, null, 2)};

const SKILLS = ${JSON.stringify(clean.SKILLS, null, 2)};

const ABOUT = ${JSON.stringify(clean.ABOUT, null, 2)};

const CUSTOM_SECTIONS = ${JSON.stringify(clean.CUSTOM_SECTIONS || [], null, 2)};

if (typeof window !== "undefined") {
  window.PROFILE = PROFILE;
  window.PROJECTS = PROJECTS;
  window.EXPERIENCE = EXPERIENCE;
  window.RECOGNITION = RECOGNITION;
  window.SKILLS = SKILLS;
  window.ABOUT = ABOUT;
  window.CUSTOM_SECTIONS = CUSTOM_SECTIONS;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROFILE, PROJECTS, EXPERIENCE, RECOGNITION, SKILLS, ABOUT, CUSTOM_SECTIONS };
}
`;
  }

  /* ---------- Auth Screen Controller ---------- */

  function renderAuthScreen() {
    const container = document.getElementById("auth-content");
    const isConfigured = CryptoManager.isConfigured();

    if (!isConfigured) {
      // First-time setup
      container.innerHTML = `
        <div style="font-family: var(--mono); font-size: 11px; text-transform: uppercase; color: var(--admin-accent); margin-bottom: 6px;">Initial Security Setup</div>
        <h2 class="modal-title">Admin Vault Setup</h2>
        <p class="modal-sub">Create your private Master Password and connect your GitHub token. Secrets are never saved in plain text or published to git.</p>
        
        <div class="vault-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <div><strong>Zero-Knowledge Security:</strong> Your token is encrypted with AES-256-GCM using your password. Only your browser can decrypt it.</div>
        </div>

        <form id="setup-form">
          <div class="form-group">
            <label class="form-label">GitHub Personal Access Token (PAT)</label>
            <input type="password" class="form-control" id="setup-token" placeholder="github_pat_... or ghp_..." required autocomplete="off">
            <div class="form-hint">Fine-grained token with 'Contents: Read and write' on <code>${REPO_OWNER}/${REPO_NAME}</code></div>
          </div>
          <div class="form-group">
            <label class="form-label">Choose Master Password (at least 6 characters)</label>
            <input type="password" class="form-control" id="setup-pass" required minlength="6" placeholder="••••••••••••">
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Master Password</label>
            <input type="password" class="form-control" id="setup-pass-confirm" required minlength="6" placeholder="••••••••••••">
          </div>
          <div id="setup-error" style="color: var(--admin-danger); font-size: 12px; margin-bottom: 12px; display: none;"></div>
          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;" id="btn-submit-setup">
            Initialize & Unlock Admin Vault
          </button>
        </form>
      `;

      document.getElementById("setup-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = document.getElementById("setup-token").value.trim();
        const pass = document.getElementById("setup-pass").value;
        const confirm = document.getElementById("setup-pass-confirm").value;
        const errEl = document.getElementById("setup-error");
        const btn = document.getElementById("btn-submit-setup");

        errEl.style.display = "none";

        if (pass !== confirm) {
          errEl.textContent = "Passwords do not match.";
          errEl.style.display = "block";
          return;
        }

        btn.disabled = true;
        btn.textContent = "Verifying Token with GitHub...";

        try {
          sessionToken = token;
          const user = await GitHubClient.verifyToken();
          await CryptoManager.setup(pass, token);
          showToast(`Authenticated as @${user.login}`);
          unlockApp();
        } catch (err) {
          sessionToken = null;
          errEl.textContent = `GitHub Verification Failed: ${err.message}. Please verify token scopes.`;
          errEl.style.display = "block";
          btn.disabled = false;
          btn.textContent = "Initialize & Unlock Admin Vault";
        }
      });
    } else {
      // Returning user login
      container.innerHTML = `
        <div style="font-family: var(--mono); font-size: 11px; text-transform: uppercase; color: var(--admin-accent); margin-bottom: 6px;">Hardware Admin Vault</div>
        <h2 class="modal-title">Enter Master Password</h2>
        <p class="modal-sub">Enter your password to decrypt session keys and access the editor.</p>

        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Master Password</label>
            <input type="password" class="form-control" id="login-pass" required placeholder="••••••••••••" autofocus autocomplete="current-password">
          </div>
          <div id="login-error" style="color: var(--admin-danger); font-size: 12px; margin-bottom: 12px; display: none;"></div>
          <div style="display: flex; gap: 10px;">
            <button type="submit" class="btn btn-primary" style="flex: 2; justify-content: center;" id="btn-submit-login">
              Unlock Studio
            </button>
            <button type="button" class="btn btn-sm btn-danger" id="btn-reset-vault" style="flex: 1; justify-content: center;" title="Reset stored credentials">
              Reset Vault
            </button>
          </div>
        </form>
      `;

      document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const pass = document.getElementById("login-pass").value;
        const errEl = document.getElementById("login-error");
        const btn = document.getElementById("btn-submit-login");

        errEl.style.display = "none";
        btn.disabled = true;
        btn.textContent = "Decrypting Keys...";

        const success = await CryptoManager.unlock(pass);
        if (success) {
          try {
            const user = await GitHubClient.verifyToken();
            showToast(`Welcome back, @${user.login}`);
            unlockApp();
          } catch (err) {
            errEl.textContent = `Token error: ${err.message}. Consider resetting the vault.`;
            errEl.style.display = "block";
            btn.disabled = false;
            btn.textContent = "Unlock Studio";
          }
        } else {
          errEl.textContent = "Incorrect password. Cryptographic decryption failed.";
          errEl.style.display = "block";
          btn.disabled = false;
          btn.textContent = "Unlock Studio";
        }
      });

      document.getElementById("btn-reset-vault").addEventListener("click", () => {
        if (confirm("Reset local credentials? You will need to enter your GitHub token and a new password.")) {
          CryptoManager.reset();
          renderAuthScreen();
        }
      });
    }
  }

  function unlockApp() {
    document.getElementById("auth-modal").style.display = "none";
    document.getElementById("admin-app").style.display = "block";
    initDataAndUI();
  }

  function lockApp() {
    CryptoManager.lock();
    document.getElementById("admin-app").style.display = "none";
    document.getElementById("auth-modal").style.display = "flex";
    renderAuthScreen();
  }

  /* ---------- Data Initialization & Rendering ---------- */

  function initDataAndUI() {
    // Load from data.js globals, with clone
    workingData = {
      PROFILE: JSON.parse(JSON.stringify(window.PROFILE || {})),
      PROJECTS: JSON.parse(JSON.stringify(window.PROJECTS || [])),
      EXPERIENCE: JSON.parse(JSON.stringify(window.EXPERIENCE || [])),
      RECOGNITION: JSON.parse(JSON.stringify(window.RECOGNITION || [])),
      SKILLS: JSON.parse(JSON.stringify(window.SKILLS || [])),
      ABOUT: JSON.parse(JSON.stringify(window.ABOUT || {})),
      CUSTOM_SECTIONS: JSON.parse(JSON.stringify(window.CUSTOM_SECTIONS || []))
    };

    renderProjectsTab();
    renderCustomSectionsTab();
    renderProfileTab();
    renderExperienceTab();
    renderSkillsTab();
    wireNavigationTabs();
  }

  /* ---------- TAB: PROJECTS ---------- */

  function renderProjectsTab() {
    const list = document.getElementById("projects-list");
    if (!list) return;

    if (!workingData.PROJECTS.length) {
      list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--ink-3);">No projects yet. Click '+ Add New Project' to get started.</div>`;
      return;
    }

    list.innerHTML = workingData.PROJECTS.map((p, idx) => {
      const mediaCount = (p.media || []).filter(m => m.src).length;
      return `
        <div class="item-row" data-index="${idx}">
          <div class="item-info">
            <div class="item-title">
              <span>${esc(p.title)}</span>
              <span class="chip" style="font-size: 10px;">${esc(p.year || "2026")}</span>
              ${mediaCount > 0 ? `<span class="chip" style="font-size: 10px; color: var(--admin-accent);">📷 ${mediaCount} photo(s)</span>` : ""}
            </div>
            <div class="item-meta">
              Slug: <code>${esc(p.slug)}</code> · Stack: ${(p.stack || []).join(", ") || "None"}
            </div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-edit-proj" data-index="${idx}">Edit</button>
            <button class="btn btn-sm btn-danger btn-del-proj" data-index="${idx}">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    // Wire edit & delete buttons
    list.querySelectorAll(".btn-edit-proj").forEach(btn => {
      btn.addEventListener("click", () => openProjectModal(parseInt(btn.dataset.index, 10)));
    });
    list.querySelectorAll(".btn-del-proj").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (confirm(`Delete project "${workingData.PROJECTS[idx].title}"?`)) {
          workingData.PROJECTS.splice(idx, 1);
          markUnsaved();
          renderProjectsTab();
        }
      });
    });
  }

  // Project Modal
  let activeProjectIndex = null;
  let activeProjectMedia = [];

  function openProjectModal(index = null) {
    activeProjectIndex = index;
    const isNew = index === null;
    const proj = isNew
      ? {
          title: "",
          slug: "",
          year: String(new Date().getFullYear()),
          role: "Solo — hardware project",
          summary: "",
          stack: [],
          body: [],
          highlights: [],
          links: [],
          media: []
        }
      : workingData.PROJECTS[index];

    activeProjectMedia = JSON.parse(JSON.stringify(proj.media || []));

    document.getElementById("project-modal-title").textContent = isNew ? "Add New Project" : "Edit Project";
    document.getElementById("proj-title").value = proj.title || "";
    document.getElementById("proj-slug").value = proj.slug || "";
    document.getElementById("proj-year").value = proj.year || "";
    document.getElementById("proj-role").value = proj.role || "";
    document.getElementById("proj-summary").value = proj.summary || "";
    document.getElementById("proj-stack").value = (proj.stack || []).join(", ");
    document.getElementById("proj-body").value = (proj.body || []).join("\n\n");
    document.getElementById("proj-highlights").value = (proj.highlights || []).join("\n");

    const link = (proj.links && proj.links[0]) || {};
    document.getElementById("proj-link-label").value = link.label || "";
    document.getElementById("proj-link-href").value = link.href || "";

    // Auto-slugify on title change if slug was empty
    const titleInput = document.getElementById("proj-title");
    const slugInput = document.getElementById("proj-slug");
    titleInput.oninput = () => {
      if (isNew || !slugInput.value) {
        slugInput.value = slugify(titleInput.value);
      }
    };

    renderProjectMediaGallery();
    document.getElementById("project-modal").style.display = "flex";
  }

  function renderProjectMediaGallery() {
    const gallery = document.getElementById("proj-media-gallery");
    if (!activeProjectMedia.length) {
      gallery.innerHTML = `<div style="grid-column: 1/-1; font-size: 12px; color: var(--ink-3); text-align: center; padding: 12px;">No photos attached yet. Drop photos above!</div>`;
      return;
    }

    gallery.innerHTML = activeProjectMedia.map((m, mIdx) => {
      const src = m.src || "";
      const caption = m.caption || "";
      return `
        <div class="media-thumb-card" data-midx="${mIdx}">
          <button class="media-thumb-del" data-midx="${mIdx}" title="Remove photo">✕</button>
          <img src="${esc(src)}" class="media-thumb-img" alt="${esc(caption)}">
          <div class="media-thumb-body">
            <input type="text" class="media-thumb-caption" data-midx="${mIdx}" value="${esc(caption)}" placeholder="Photo caption...">
          </div>
        </div>
      `;
    }).join("");

    gallery.querySelectorAll(".media-thumb-del").forEach(btn => {
      btn.addEventListener("click", () => {
        const mIdx = parseInt(btn.dataset.midx, 10);
        activeProjectMedia.splice(mIdx, 1);
        renderProjectMediaGallery();
      });
    });

    gallery.querySelectorAll(".media-thumb-caption").forEach(inp => {
      inp.addEventListener("change", (e) => {
        const mIdx = parseInt(inp.dataset.midx, 10);
        if (activeProjectMedia[mIdx]) {
          activeProjectMedia[mIdx].caption = e.target.value.trim();
        }
      });
    });
  }

  function wirePhotoUploader() {
    const zone = document.getElementById("proj-upload-zone");
    const input = document.getElementById("proj-file-input");
    const status = document.getElementById("proj-upload-status");

    zone.addEventListener("click", () => input.click());

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });

    input.addEventListener("change", () => {
      if (input.files && input.files.length) {
        handleFiles(input.files);
      }
    });

    async function handleFiles(files) {
      status.textContent = `Optimizing ${files.length} photo(s)...`;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        try {
          // Process at 2048px max dimension, quality 0.90 for high-fidelity PCB/waveforms
          const result = await ImageProcessor.process(file, 2048, 0.90);
          const origMb = (result.originalSize / (1024 * 1024)).toFixed(1);
          const compKb = result.compressedSize;

          const repoPath = `images/${result.filename}`;

          // Stage photo to be committed when publishing
          stagedPhotos.push({
            path: repoPath,
            base64: result.base64,
            previewUrl: result.dataUrl
          });

          // Attach to active project media (keep previewUrl for immediate local preview)
          activeProjectMedia.push({
            src: repoPath,
            previewUrl: result.dataUrl,
            caption: file.name.replace(/\.[^.]+$/, "")
          });

          status.textContent = `Optimized: ${file.name} (${origMb}MB → ${compKb}KB) · Crisp high-res ready`;
        } catch (err) {
          console.error("Upload error:", err);
          status.textContent = `Error processing ${file.name}: ${err.message}`;
        }
      }
      renderProjectMediaGallery();
      setTimeout(() => { status.textContent = ""; }, 5000);
    }
  }

  /* ---------- TAB: CUSTOM SECTIONS (e.g. Board Exploration) ---------- */

  function renderCustomSectionsTab() {
    const container = document.getElementById("custom-sections-container");
    if (!container) return;

    if (!workingData.CUSTOM_SECTIONS.length) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--ink-3);">
          No custom sections yet. Click '+ Add New Section' to create sections like "Board Exploration" or "Lab Notes".
        </div>
      `;
      return;
    }

    container.innerHTML = workingData.CUSTOM_SECTIONS.map((sec, sIdx) => {
      const itemsHtml = (sec.items || []).map((item, iIdx) => `
        <div class="item-row" style="margin-bottom: 8px;">
          <div class="item-info">
            <div class="item-title">
              <span>${esc(item.title)}</span>
              <span class="chip" style="font-size: 10px;">${esc(item.date || "")}</span>
            </div>
            <div class="item-meta">${esc(item.summary || "")}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-del-sec-item" data-sidx="${sIdx}" data-iidx="${iIdx}">Remove Item</button>
          </div>
        </div>
      `).join("");

      return `
        <div class="admin-card" style="margin-top: 16px;">
          <div class="admin-card-head">
            <div>
              <h4 style="margin: 0; font-size: 15px;">${esc(sec.title)} <span class="chip" style="font-size: 10px;">#${esc(sec.id)}</span></h4>
              <span class="form-hint">${esc(sec.subtitle || "No subtitle")}</span>
            </div>
            <div class="item-actions">
              <button class="btn btn-sm btn-primary btn-add-sec-item" data-sidx="${sIdx}">+ Add Card</button>
              <button class="btn btn-sm btn-danger btn-del-sec" data-sidx="${sIdx}">Delete Section</button>
            </div>
          </div>
          <div class="item-list">
            ${itemsHtml || '<div style="font-size: 12px; color: var(--ink-3); padding: 8px;">No cards in this section yet.</div>'}
          </div>
        </div>
      `;
    }).join("");

    // Wire actions
    container.querySelectorAll(".btn-del-sec").forEach(btn => {
      btn.addEventListener("click", () => {
        const sIdx = parseInt(btn.dataset.sidx, 10);
        if (confirm(`Delete custom section "${workingData.CUSTOM_SECTIONS[sIdx].title}"?`)) {
          workingData.CUSTOM_SECTIONS.splice(sIdx, 1);
          markUnsaved();
          renderCustomSectionsTab();
        }
      });
    });

    container.querySelectorAll(".btn-add-sec-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const sIdx = parseInt(btn.dataset.sidx, 10);
        const title = prompt("Card Title (e.g. STM32 Minimal System Bring-Up):");
        if (!title) return;
        const summary = prompt("Brief summary / punchline:") || "";
        const date = prompt("Year / Date (e.g. 2026):") || String(new Date().getFullYear());

        workingData.CUSTOM_SECTIONS[sIdx].items = workingData.CUSTOM_SECTIONS[sIdx].items || [];
        workingData.CUSTOM_SECTIONS[sIdx].items.push({
          title: title,
          date: date,
          summary: summary,
          tags: ["Hardware", "Bring-Up"],
          media: [],
          link: null
        });
        markUnsaved();
        renderCustomSectionsTab();
      });
    });

    container.querySelectorAll(".btn-del-sec-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const sIdx = parseInt(btn.dataset.sidx, 10);
        const iIdx = parseInt(btn.dataset.iidx, 10);
        workingData.CUSTOM_SECTIONS[sIdx].items.splice(iIdx, 1);
        markUnsaved();
        renderCustomSectionsTab();
      });
    });
  }

  /* ---------- TAB: PROFILE & ABOUT ---------- */

  function renderProfileTab() {
    const prof = workingData.PROFILE || {};
    document.getElementById("prof-name").value = prof.name || "";
    document.getElementById("prof-role").value = prof.role || "";
    document.getElementById("prof-tagline").value = prof.tagline || "";
    document.getElementById("prof-status").value = prof.status || "";
    document.getElementById("prof-location").value = prof.location || "";
    document.getElementById("prof-email").value = prof.email || "";

    const about = workingData.ABOUT || {};
    document.getElementById("about-paragraphs").value = (about.paragraphs || []).join("\n\n");

    const now = about.now || [];
    const building = now.find(n => n.label === "Building");
    const learning = now.find(n => n.label === "Learning");
    const looking = now.find(n => n.label === "Looking for");

    document.getElementById("now-building").value = building ? building.value : "";
    document.getElementById("now-learning").value = learning ? learning.value : "";
    document.getElementById("now-looking").value = looking ? looking.value : "";
  }

  /* ---------- TAB: EXPERIENCE & RECOGNITION ---------- */

  function renderExperienceTab() {
    const expList = document.getElementById("experience-list");
    expList.innerHTML = workingData.EXPERIENCE.map((x, idx) => `
      <div class="item-row">
        <div class="item-info">
          <div class="item-title">${esc(x.role)} <span class="chip" style="font-size: 10px;">${esc(x.period)}</span></div>
          <div class="item-meta">${esc(x.org)} · ${esc(x.place)}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-del-exp" data-index="${idx}">Delete</button>
        </div>
      </div>
    `).join("");

    expList.querySelectorAll(".btn-del-exp").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        workingData.EXPERIENCE.splice(idx, 1);
        markUnsaved();
        renderExperienceTab();
      });
    });

    const recList = document.getElementById("recognition-list");
    recList.innerHTML = workingData.RECOGNITION.map((r, idx) => `
      <div class="item-row">
        <div class="item-info">
          <div class="item-title">${esc(r.title)} <span class="chip" style="font-size: 10px;">${esc(r.kind)}</span></div>
          <div class="item-meta">${esc(r.org)} · ${esc(r.date)}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-del-rec" data-index="${idx}">Delete</button>
        </div>
      </div>
    `).join("");

    recList.querySelectorAll(".btn-del-rec").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        workingData.RECOGNITION.splice(idx, 1);
        markUnsaved();
        renderExperienceTab();
      });
    });
  }

  /* ---------- TAB: SKILLS ---------- */

  function renderSkillsTab() {
    const list = document.getElementById("skills-list");
    list.innerHTML = workingData.SKILLS.map((grp, gIdx) => {
      const items = (grp.items || []).map(i => `<span class="tag">${esc(i.name)} (${esc(i.level)})</span>`).join(" ");
      return `
        <div class="admin-card" style="margin-bottom: 14px;">
          <div class="admin-card-head">
            <h4 style="margin: 0;">${esc(grp.group)}</h4>
            <button class="btn btn-sm btn-del-skill-group" data-gidx="${gIdx}">Delete Group</button>
          </div>
          <div class="tags">${items}</div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".btn-del-skill-group").forEach(btn => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt(btn.dataset.gidx, 10);
        workingData.SKILLS.splice(gIdx, 1);
        markUnsaved();
        renderSkillsTab();
      });
    });
  }

  /* ---------- Navigation & Actions Wiring ---------- */

  function wireNavigationTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add("active");
      });
    });

    // Add New Project button
    document.getElementById("btn-add-project").addEventListener("click", () => openProjectModal(null));

    // Close Project Modal
    document.getElementById("btn-close-project-modal").addEventListener("click", () => {
      document.getElementById("project-modal").style.display = "none";
    });
    document.getElementById("btn-cancel-project").addEventListener("click", () => {
      document.getElementById("project-modal").style.display = "none";
    });

    // Save Project Modal
    document.getElementById("btn-save-project-data").addEventListener("click", () => {
      const title = document.getElementById("proj-title").value.trim();
      const slug = slugify(document.getElementById("proj-slug").value || title);

      if (!title || !slug) {
        alert("Please provide at least a project title.");
        return;
      }

      const stack = document.getElementById("proj-stack").value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const body = document.getElementById("proj-body").value
        .split(/\n\s*\n/)
        .map(s => s.trim())
        .filter(Boolean);

      const highlights = document.getElementById("proj-highlights").value
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);

      const linkLabel = document.getElementById("proj-link-label").value.trim();
      const linkHref = document.getElementById("proj-link-href").value.trim();
      const links = linkLabel && linkHref ? [{ label: linkLabel, href: linkHref }] : [];

      const newProj = {
        slug: slug,
        title: title,
        summary: document.getElementById("proj-summary").value.trim(),
        year: document.getElementById("proj-year").value.trim() || "2026",
        role: document.getElementById("proj-role").value.trim() || "Hardware Engineer",
        stack: stack,
        body: body,
        highlights: highlights,
        links: links,
        media: activeProjectMedia
      };

      if (activeProjectIndex === null) {
        workingData.PROJECTS.unshift(newProj);
      } else {
        workingData.PROJECTS[activeProjectIndex] = newProj;
      }

      markUnsaved();
      renderProjectsTab();
      document.getElementById("project-modal").style.display = "none";
      showToast(`Project "${title}" saved to draft.`);
    });

    // Add Custom Section
    document.getElementById("btn-add-section").addEventListener("click", () => {
      const title = prompt("Section Title (e.g. Board Exploration, Hardware Teardowns):");
      if (!title) return;
      const subtitle = prompt("Subtitle / Description:") || "";
      const id = slugify(title);

      workingData.CUSTOM_SECTIONS.push({
        id: id,
        title: title,
        subtitle: subtitle,
        items: []
      });
      markUnsaved();
      renderCustomSectionsTab();
      showToast(`Custom section "${title}" added.`);
    });

    // Save Profile & About
    document.getElementById("btn-save-profile").addEventListener("click", () => {
      workingData.PROFILE.name = document.getElementById("prof-name").value.trim();
      workingData.PROFILE.role = document.getElementById("prof-role").value.trim();
      workingData.PROFILE.tagline = document.getElementById("prof-tagline").value.trim();
      workingData.PROFILE.status = document.getElementById("prof-status").value.trim();
      workingData.PROFILE.location = document.getElementById("prof-location").value.trim();
      workingData.PROFILE.email = document.getElementById("prof-email").value.trim();
      markUnsaved();
      showToast("Profile details updated.");
    });

    document.getElementById("btn-save-about").addEventListener("click", () => {
      const paras = document.getElementById("about-paragraphs").value
        .split(/\n\s*\n/)
        .map(s => s.trim())
        .filter(Boolean);

      workingData.ABOUT.paragraphs = paras;
      workingData.ABOUT.now = [
        { label: "Building", value: document.getElementById("now-building").value.trim() },
        { label: "Learning", value: document.getElementById("now-learning").value.trim() },
        { label: "Looking for", value: document.getElementById("now-looking").value.trim() }
      ];
      markUnsaved();
      showToast("About section updated.");
    });

    // Add Experience
    document.getElementById("btn-add-experience").addEventListener("click", () => {
      const role = prompt("Role (e.g. Firmware Engineer Intern):");
      if (!role) return;
      const org = prompt("Organization / Company:") || "";
      const period = prompt("Period (e.g. Jan 2026 — Present):") || "2026";
      const place = prompt("Location (e.g. Chennai / Remote):") || "Chennai";

      workingData.EXPERIENCE.unshift({
        role: role,
        org: org,
        period: period,
        place: place,
        bullets: []
      });
      markUnsaved();
      renderExperienceTab();
    });

    // Add Recognition
    document.getElementById("btn-add-recognition").addEventListener("click", () => {
      const title = prompt("Recognition / Award Title:");
      if (!title) return;
      const kind = prompt("Type (Award / Scholarship / Report / Certificate):") || "Award";
      const org = prompt("Organization / Event:") || "";
      const date = prompt("Date (e.g. Oct 2026):") || "2026";

      workingData.RECOGNITION.unshift({
        title: title,
        kind: kind,
        org: org,
        date: date,
        note: ""
      });
      markUnsaved();
      renderExperienceTab();
    });

    // Add Skill Group
    document.getElementById("btn-add-skill-group").addEventListener("click", () => {
      const groupName = prompt("Skill Group Name (e.g. Power Electronics, RF):");
      if (!groupName) return;
      workingData.SKILLS.push({
        group: groupName,
        items: []
      });
      markUnsaved();
      renderSkillsTab();
    });

    // Preview Draft Button
    document.getElementById("btn-preview-draft").addEventListener("click", () => {
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(workingData));
      window.open("index.html?preview=1", "_blank");
      showToast("Preview draft saved. Opening site preview in new tab...");
    });

    // Backup data.js Button
    document.getElementById("btn-backup-data").addEventListener("click", () => {
      const code = serializeDataJs(workingData);
      const blob = new Blob([code], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-${Date.now()}.js`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Downloaded data.js backup to your device.");
    });

    // Publish to GitHub Button
    document.getElementById("btn-publish-github").addEventListener("click", publishToGitHub);

    // Lock Button
    document.getElementById("btn-lock").addEventListener("click", () => {
      if (unsavedChanges && !confirm("You have unsaved changes in draft. Lock session anyway?")) {
        return;
      }
      lockApp();
    });

    wirePhotoUploader();
  }

  function markUnsaved() {
    unsavedChanges = true;
    const status = document.getElementById("repo-status");
    if (status) {
      status.textContent = "● Unsaved Draft Changes";
      status.style.color = "var(--admin-accent)";
    }
  }

  /* ---------- Publish to GitHub Workflow ---------- */

  async function publishToGitHub() {
    const btn = document.getElementById("btn-publish-github");
    const spinner = document.getElementById("publish-spinner");

    if (!confirm("Commit and publish all changes and photos directly to GitHub?")) return;

    btn.disabled = true;
    spinner.style.display = "inline";
    btn.textContent = "Publishing to GitHub...";

    try {
      // Step 1: Upload any staged photos to images/ in repo
      if (stagedPhotos.length > 0) {
        showToast(`Uploading ${stagedPhotos.length} photo(s) to GitHub images/...`);
        for (const photo of stagedPhotos) {
          try {
            // Check if file exists to get sha if replacing
            const existing = await GitHubClient.getFile(photo.path);
            await GitHubClient.commitFile(
              photo.path,
              photo.base64,
              `Upload portfolio media: ${photo.path} [admin]`,
              existing ? existing.sha : null
            );
          } catch (err) {
            console.error(`Failed to upload ${photo.path}:`, err);
          }
        }
        stagedPhotos = [];
      }

      // Step 2: Fetch current data.js sha
      showToast("Updating data.js on GitHub main branch...");
      const current = await GitHubClient.getFile("data.js");
      const sha = current ? current.sha : null;

      // Step 3: Serialize and commit new data.js
      const code = serializeDataJs(workingData);
      const base64Code = utf8ToBase64(code);

      await GitHubClient.commitFile(
        "data.js",
        base64Code,
        "Update portfolio content via Admin Studio [skip ci]",
        sha
      );

      unsavedChanges = false;
      const status = document.getElementById("repo-status");
      if (status) {
        status.textContent = "● Synced with GitHub";
        status.style.color = "var(--admin-success)";
      }

      showToast("🎉 Published successfully! GitHub Pages will update in ~30-60s.");
    } catch (err) {
      console.error("Publish failed:", err);
      alert(`Publishing failed: ${err.message}. Please check your token permissions.`);
    } finally {
      btn.disabled = false;
      spinner.style.display = "none";
      btn.innerHTML = "Publish to GitHub";
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  /* ---------- Boot ---------- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderAuthScreen();
    });
  } else {
    renderAuthScreen();
  }

})();

