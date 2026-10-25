# Portfolio — K.S. Madhavkrishnan

Static site. No framework, no build step, no dependencies to install.

## Files

| File | What it is |
|---|---|
| `index.html` | The main page. Header, hero, work, experience, recognition, skills, about, contact. |
| `project.html` | Detail page template. One file serves every project via `?p=slug`. |
| `data.js` | **All the content.** This is the only file you normally edit. |
| `styles.css` | All styling, light + dark theme, print styles. |
| `main.js` | Renders the pages from `data.js`, theme toggle, scroll reveal. |

## Editing content

Open `data.js`. It has six blocks:

- `PROFILE` — name, role, tagline, status line, email, links.
- `PROJECTS` — one object per project. `slug` becomes the URL.
- `EXPERIENCE` — internships, jobs, education.
- `RECOGNITION` — awards, scholarship, certificate, report, workshops, hackathons.
- `SKILLS` — groups of four items each. Add a group and the grid reflows.
- `ABOUT` — the two paragraphs and the "currently" list.

Save the file and refresh the browser. Nothing to rebuild.

### Adding a project

1. Copy an existing object in `PROJECTS`.
2. Change `slug` to something unique, lowercase with hyphens
   (`dual-fuel-ecu`).
3. Fill in the fields.
4. Its URL becomes `project.html?p=dual-fuel-ecu`.

The order of objects in the array is the order on the page.

### Adding images

Put files in an `images/` folder next to `index.html`, then in the project's
`media` array:

```js
media: [
  { src: "images/ecu-board.jpg", caption: "Board, rev B, populated" }
]
```

Leave `src` out and you get an empty placeholder frame with the caption in it.

## Publishing on GitHub Pages

1. Create a repo, e.g. `portfolio`.
2. Push these five files to the root of `main`.
3. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`,
   folder `/ (root)`. Save.
4. It goes live at `https://<username>.github.io/portfolio/` in a minute or two.

Custom domain: add a `CNAME` file containing just your domain name, then point
a CNAME DNS record at `<username>.github.io`.

## Notes

- Dark mode is stored in `localStorage` and defaults to the OS setting.
- The board drawings on each project card are generated in `main.js`
  (`boardGlyph`) from a hash of the project slug — every project gets a
  different one, no image files needed. Replace the whole `.card-media` block
  with a real `<img>` when you have photos.
- `resume.pdf` is linked from the header and contact section. Drop a real PDF
  with that name next to `index.html`, or remove the link from `PROFILE.links`.
- The site prints cleanly (Ctrl+P) — useful if anyone wants it on paper.
