# Decisions

- **Client hosting approach**
  - Firebase Hosting serves static files from `client/public`.
  - JavaScript is written in `client/src` (source of truth).
  - A small sync script (`client/scripts/sync_public.php`) copies `client/src` into `client/public/src` before deploy.

- **Firebase Web SDK**
  - Use Firebase Web SDK via ESM CDN imports (`gstatic`) to avoid a build tool for the MVP.

- **Profile nickname write path (Step 1 only)**
  - For Step 1, nickname is written directly to `users/{uid}` from the client (allowed by the intended Firestore Rules).
  - This will be switched to the required authoritative endpoint `POST /api/profile/nickname` once the PHP backend exists.

- **Routing**
  - Multi-page app (separate HTML files) instead of SPA to keep MVP simple and resilient.

- **Deck SVG mapping (baraja_espanola.svg)**
  - The SVG encodes cards as `<g id="...">` groups like `2_diamond`, `king_spade`, etc.
  - Suit mapping used:
    - `diamond` -> `oros`
    - `heart` -> `copas`
    - `spade` -> `espadas`
    - `club` -> `bastos`
  - Spanish 40-card deck mapping:
    - Use ranks `1..7` plus `10/11/12`.
    - Map `jack/queen/king` to ranks `10/11/12` respectively.
    - Ignore numeric `8` and `9` from the SVG.
    - Ignore the SVG `10_<suit>` numeric cards in favor of `jack_<suit>` as rank 10.
