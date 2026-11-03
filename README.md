# PayID Frontend Web Application

Vue 3 single-page application built with Vite.

## Local development

```sh
npm ci
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

The Vite base path is configured for the GitHub repository `PayID-Frontend-Web-Application`. The GitHub Actions workflow in `.github/workflows/deploy.yml` builds the app and publishes `dist` to GitHub Pages. `public/404.html` redirects unknown Pages routes back through `index.html`, where the original route is restored for Vue Router.
