# The Peterson Community website

The static site for thepeterson.org, published with GitHub Pages from the `main` branch. There is no build step: every file in this folder is served as it is.

## Forms

The membership enquiry and the Letters sign-up in `index.html` each carry `data-endpoint=""` and `data-email="info@thepeterson.org"`.

- With no endpoint, both open the visitor's email app with a prefilled message to info@thepeterson.org. The enquiry form also shows the text to copy if no email app opens.
- To receive submissions directly, paste a form service URL (Formspree, Basin, or your own serverless function) into `data-endpoint`. The enquiry posts `name`, `email`, `link`, `city`, `work`, `contribute` (one entry per choice) and `note`; Letters posts `email`. If the service fails, the form falls back to email.

## Preview locally

The globe loads `assets/land.geojson`, so serve the folder instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Custom domain

To serve this repository at thepeterson.org, add the domain under Settings → Pages, then point the domain's DNS records at GitHub Pages as described in GitHub's custom domain guide. Until then the site is available at its github.io address.
