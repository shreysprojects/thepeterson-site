# The Peterson Community website

The static site for thepeterson.org, published with GitHub Pages from the `main` branch. There is no build step: every file in this folder is served as it is.

## What's on the page

The homepage uses the Meridian layout, kept simple: the wordmark on the left of the header with the links and Apply on the right, and every section centred beneath it. On laptops and wider, the hero puts the headline on the left and the whole globe on the right, sized to the window's height so it is in view on arrival; on phones and tablets they stack. The palette is navy, ivory and white only. Styles live in `site.css`.

- `globe.js`: the binary globe in the hero, white digits on a slightly lighter navy disc, with no outline. It turns all the time (one turn every 50 seconds, as on the original site), stops while it is held, and carries on when let go. Choose one of the six member cities (Montréal, New York, London, Shanghai, Hong Kong, Singapore) on the globe or with the names below it to fly there; one line beneath shows its local time, whether it is day or night there, and its distance from the visitor. The night side is simply dimmer, from the sun's real position. A "You" tab places the visitor from their device time zone; nothing is looked up or sent. The digits spell "what comes next" in ASCII. Land outlines (Natural Earth) are embedded in the script, and drawing stops whenever the globe is off-screen. To add a city, add it to `cities` (and `routes`, if it should be linked) in `globe.js`, then add a matching tab in `index.html`.
- `features.js`: the question deck (one card at a time) and the city clocks in the footer. Nothing in it moves on its own.

The gathering format is three equal, unnumbered cards in plain HTML (`.format-steps` in `index.html`), each with a small diagram of ten identical seats.

The community copy describes the reach in open terms on purpose: no city names, continent names or counts.
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
