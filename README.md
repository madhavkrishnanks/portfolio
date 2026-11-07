# Portfolio — K.S. Madhavkrishnan

Hardware & Embedded Engineering Portfolio: board design, firmware, bring-up, and validation work.

- **Live Site:** [https://madhavkrishnanks.github.io/portfolio/](https://madhavkrishnanks.github.io/portfolio/)
- **Repository:** [https://github.com/madhavkrishnanks/portfolio](https://github.com/madhavkrishnanks/portfolio) (`main` branch, published from `/ (root)`)

Static site architecture. Zero build step, zero dependencies, framework-free.

---

## 1. File Structure

| File | Type | Description |
| :--- | :--- | :--- |
| `index.html` | Public | Main landing page: hero, 5-layer exploded PCB board, selected work, experience, recognition, capabilities, about, contact, and dark/light theme toggle. |
| `project.html` | Public | Project detail page template. Serves all project pages dynamically via `?p=<slug>`. |
| `content.json` | Public / Data | Single UTF-8 JSON database holding all portfolio data across 6 sections. |
| `board.js` | Public / Script | 5-layer exploded PCB hero SVG visualization with scroll-based 3D separation and mouse tracking. |
| `main.js` | Public / Script | Fetches `content.json`, populates DOM sections, generates deterministic PCB trace SVGs (`boardGlyph`), renders photo media, and handles theme switching. |
| `styles.css` | Public / Style | Complete datasheet-inspired stylesheet, responsive layout, dark/light themes, PCB transforms, and print styles. |
| `admin.html` | Private Studio | Owner-only content and photo studio shell (`<meta name="robots" content="noindex,nofollow">`, zero links from public pages). Gated behind fine-grained GitHub PAT. |
| `admin.css` | Private Studio | Datasheet styling for the admin panel, matching `--bg: #faf8f4`, `--accent: #b4451f`, IBM Plex Mono, and Inter Tight. |
| `admin.js` | Private Studio | GitHub REST API client (`2022-11-28`) with client-side `<canvas>` JPEG photo compression (`<300 KB`), SHA conflict retry, and direct commits to `content.json` and `images/`. |

---

## 2. `content.json` Schema

The entire portfolio is driven by `content.json` at the repository root. It contains 6 primary top-level keys:

### `profile` (Object)
- `name` *(string)*: Full name.
- `role` *(string)*: Professional title.
- `tagline` *(string)*: Headline statement.
- `location` *(string)*: Geographic location.
- `status` *(string)*: Current availability status.
- `email` *(string)*: Contact email address.
- `links` *(array of `{ label: string, href: string }`)*: Profile links (GitHub, LinkedIn, Resume, etc.).

### `projects` (Array of Objects)
Each hardware project entry:
- `slug` *(string)*: URL parameter slug (`project.html?p=<slug>`). Must be unique, lowercase, hyphenated.
- `title` *(string)*: Project display title.
- `summary` *(string)*: Brief overview for project cards and lede text.
- `year` *(string)*: Year completed or active.
- `role` *(string)*: Team role or capacity.
- `stack` *(array of strings)*: Hardware/firmware technologies and protocols.
- `body` *(array of strings)*: Narrative paragraphs explaining technical architecture, design trade-offs, and implementation details.
- `highlights` *(array of strings)*: Key bench measurements, specifications, and quantitative findings.
- `links` *(array of `{ label: string, href: string }`)*: Links to schematics, repositories, papers, or demos.
- `media` *(array of `{ src: string, caption: string }`)*: Photos or figures. If empty, the card thumbnail generates a deterministic PCB trace SVG (`boardGlyph`).

### `experience` (Array of Objects)
- `role` *(string)*: Position or degree.
- `org` *(string)*: Organization or institution.
- `period` *(string)*: Date range (e.g., `Oct 2025 – Jan 2026`).
- `location` *(string)*: Location or remote status.
- `summary` *(string)*: Concise overview of responsibilities.
- `highlights` *(array of strings)*: Technical achievements and deliverables.
- `tags` *(array of strings)*: Tooling, simulation environments, and competencies.

### `recognition` (Array of Objects)
- `kind` *(string)*: Category (e.g., `Scholarship`, `Award`, `Report`, `Workshop`).
- `date` *(string)*: Month and year.
- `title` *(string)*: Recognition title.
- `org` *(string)*: Issuing body or institution.
- `note` *(string, optional)*: Context or background.
- `link` *(object `{ label: string, href: string }`, optional)*: Verification or publication URL.

### `skills` (Array of Objects)
- `group` *(string)*: Skill category header (e.g., `Firmware & Embedded`, `Hardware & PCB`).
- `items` *(array of `{ name: string, level: string }`)*: Specific technical capabilities and proficiency indicators.

### `about` (Object)
- `paragraphs` *(array of strings)*: Personal background, engineering philosophy, and bench setup.
- `now` *(array of `{ label: string, value: string }`)*: Key-value table of current workbench activities, chipsets in focus, and reading material.

---

## 3. GitHub Pages Deployment

The site is served statically via GitHub Pages from the repository root:

1. Push commits to the `main` branch of `madhavkrishnanks/portfolio`.
2. Under **Repository → Settings → Pages**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. Any changes pushed to `content.json` or HTML/CSS/JS files are live within 1 to 2 minutes at:
   `https://madhavkrishnanks.github.io/portfolio/`

---

## 4. Owner Admin Studio (`admin.html`)

A zero-dependency, private web interface allows editing all 6 sections and uploading compressed bench photos directly from any browser without running local tools.

### Security Model
- **Zero Public Links:** Neither `index.html` nor `project.html` links to `admin.html`.
- **Search Engine Blocking:** `<meta name="robots" content="noindex,nofollow">` prevents indexing.
- **Zero-Leak Auth Gate:** When unauthenticated, `admin.html` reveals only a password input. Repository name, project titles, and content are only fetched *after* a valid token is provided.
- **Client-Side Storage:** The Personal Access Token is stored strictly in the browser's `localStorage` (`mk_portfolio_gh_token`) and never sent anywhere except directly to `https://api.github.com`.
- **Zero Secrets in Repo:** No token, password, or secret is ever hardcoded or committed to git.

### Generating a Fine-Grained Personal Access Token (PAT)
1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name:** `Portfolio Admin Studio` (or preferred name).
3. **Expiration:** Select your preferred duration (e.g., 90 days or 1 year).
4. **Repository access:** Choose **Only select repositories** → select `madhavkrishnanks/portfolio`.
5. **Permissions:**
   - Under **Repository permissions**, find **Contents**.
   - Change access from *No access* to **Read and write**.
6. Click **Generate token** and copy the resulting `github_pat_...` string.

### Using the Admin Studio
1. Open `https://madhavkrishnanks.github.io/portfolio/admin.html` (or open `admin.html` on your local machine).
2. Paste your `github_pat_...` token and click **Connect**.
3. Select any tab (`01 // Profile` through `06 // About`) to edit content.
4. **Bench Photos:** In `02 // Projects`, drag and drop image files directly into the project editor. Images are automatically resized and compressed to `<300 KB` Web-ready JPEGs via client-side `<canvas>` and committed to `images/<slug>/`.
5. Click **Save to GitHub** in the bottom bar to commit changes directly to the `main` branch.

---

## 5. Local Development & Testing

Run a local static HTTP server to test changes locally:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .
```

Open `http://localhost:8000/` in your browser.
