# Beji Healing Retreat

Luxury healing forest retreat SPA built with native HTML5, TailwindCSS Play CDN, and vanilla ES6 modules.

## Run Locally

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Architecture

- `index.html` is the single loader.
- `router.js` handles hash-based SPA routes.
- `assets/js/core.js` loads layouts, pages, and components dynamically with `fetch()`.
- `services/` contains backend-ready abstraction layers.
- `data/` contains mock JSON that can be replaced by REST API calls.

Currency defaults to IDR and copy defaults to English.
