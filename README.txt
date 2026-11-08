Enterprise360 - free starter PWA prototype

Contents: index.html, manifest.webmanifest, sw.js.
This is a local demonstration, not a production application.
It includes business profile editing, example opportunities, compliance and growth checklists, simulated chat and an admin preview.
Demo data is stored in browser localStorage only. No authentication, database, server messaging, real payments, real funding feeds, or secure document uploads exist.

To run locally: in this directory run `python -m http.server 8000`, then visit http://localhost:8000 in a browser.
To install on Android or iPhone, first deploy via HTTPS to a static hosting service. iPhone users can use Safari > Share > Add to Home Screen. Android users can use their browser's Install/Add to Home Screen option when offered.
Before public launch: add secure backend, identity, access control, privacy compliance, backups, document storage, payment integration and real support workflows.
