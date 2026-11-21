# The Peterson Community website

The static site for thepeterson.org, published with GitHub Pages from the `main` branch. There is no build step: every file in this folder is served as it is.

## What's on the page

The homepage uses the Meridian layout: one centre line, with the logo centred in the header, the globe at the heart of the hero, and every section centred beneath it. Styles live in `site.css`.

- `globe.js`: the binary globe in the hero. Drag it or use the arrow keys to spin it, and choose a city on the globe or with the tabs below it to fly there and see its local time, daylight and distance. Night is drawn in gold from the sun's real position. A "You" marker is placed from the visitor's device time zone; nothing is looked up or sent. The digits spell "what comes next" in ASCII. Land outlines (Natural Earth) are embedded in the script, and drawing stops whenever the globe is off-screen.
- `features.js`: headlines that decode from binary on first view, the question deck, the seat-at-the-table view of the gathering format, live city clocks, and the footer phrase.
- `page.js`: the three-step membership enquiry and the Letters sign-up.

The twelve questions in the deck live as a plain list in `index.html` (`#questionDeck`). Edit them there.

## Forms

The membership enquiry and the Letters sign-up in `index.html` each carry `data-endpoint=""` and `data-email="info@thepeterson.org"`.

- With no endpoint, both open the visitor's email app with a prefilled message to info@thepeterson.org. The enquiry form also shows the text to copy if no email app opens.
- To receive submissions directly, paste a form service URL (Formspree, Basin, or your own serverless function) into `data-endpoint`. The enquiry posts `name`, `email`, `link`, `city`, `work`, `question`, `contribute` (one entry per choice) and `note`; Letters posts `email`. A question added to the deck opens the enquiry with `question` filled in. If the service fails, the form falls back to email.

## Preview locally

Serve the folder so it behaves as it does on GitHub Pages:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Custom domain

To serve this repository at thepeterson.org, add the domain under Settings → Pages, then point the domain's DNS records at GitHub Pages as described in GitHub's custom domain guide. Until then the site is available at its github.io address.
