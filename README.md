# AutoParts Hub — Website Source

This folder contains the complete source of the static AutoParts Hub demo: HTML, CSS, vanilla JavaScript and all local images/icons required by the page.

## Run locally

1. Extract the ZIP. Keep the files and the `assets` folder together.
2. Install Python 3 if it is not already available.
3. Open a terminal in the extracted `AutoParts-Hub-Source` folder—the folder containing `index.html`.
4. Start a local web server:

```sh
python3 -m http.server 8080
```

On Windows, if `python3` is unavailable, use:

```powershell
py -m http.server 8080
```

5. Open **http://localhost:8080** in a modern browser.
6. Press **Ctrl+C** in the terminal to stop the server.

For access only from your own computer, add `--bind 127.0.0.1` to the server command. Python's simple server is a development preview tool, not a production hosting server.

No npm install, build command, database setup, API keys or environment variables are needed for this demo. Opening the HTML file directly may work, but use the local server for predictable browser-storage behaviour.

## Files

```text
AutoParts-Hub-Source/
├── README.md
├── index.html
├── styles.css
├── app.js
└── assets/
    ├── workshop.jpg
    ├── brakes.jpg
    ├── filter.jpg
    ├── engine.jpg
    ├── suspension.jpg
    ├── battery.jpg
    ├── oil.jpg
    └── favicon.svg
```

- **index.html**: page structure, navigation, forms, catalogue container and modal dialog.
- **styles.css**: colours, typography, spacing, cards and responsive layouts.
- **app.js**: sample products, search/filter logic, sample vehicle matching, cart, demo checkout, local orders, local enquiries, profile and open admin demo.
- **assets/**: local images and favicon. Preserve these paths unless you also update their references in the source.

The stylesheet requests DM Sans and Manrope from Google Fonts. An internet connection is needed for those fonts; fallback fonts are specified if they cannot load. The local images and core functionality do not require a remote API after the source is downloaded.

## Try the shopping flow

1. Search for `BRK-COR-101`, or select Toyota → Corolla → 2015 and click **Find my parts**.
2. Open a product, then add it to the cart.
3. Change quantities or remove an item in the cart.
4. Proceed to checkout using fictional details such as `Demo Customer`, `0712345678` and `demo@example.test`.
5. Choose delivery and enter a fictional address, or select collection.
6. Place the demo order and view its reference/status in the tracker.
7. Open **Admin demo workspace** from the footer to edit local products and the status of your locally created order.

The fixed sample order `APH-DEMO-001` is illustrative; its status changes are not persisted. Create your own demo order to test status updates.

## Edit the website

Use any text editor, such as VS Code. Edit the HTML for content/structure, the CSS for appearance and `app.js` for behaviour. Save and refresh the browser. No build step is required.

Sample products are defined in `seedProducts` near the beginning of `app.js`. Sample models are set in `populateVehicleOptions()` and fitment examples are defined near the beginning of the file. Fitment strings must follow the expected year-range format; they are not verified real-world compatibility data.

Product data is copied into browser storage on first use. If you change the seed products, an existing browser may continue showing the previously saved catalogue. Use a fresh browser profile or intentionally clear only this demo's saved data when testing new seed data.

## Local data and resetting the demo

The demo uses these localStorage keys:

- `aph_products_v1`
- `aph_cart_v1`
- `aph_orders_v1`
- `aph_profile_v1`
- `aph_enquiries`

Data belongs to the current browser and origin. Changing the browser, hostname or port can show a different set of data. Reloading the page normally preserves saved data; clearing site storage removes it. Storage availability is not guaranteed in all browser modes, and this is not a durable database.

To reset only this demo, open browser developer tools on the local site, select the Console, and run the following. **This permanently removes this browser's local demo catalogue edits, cart, orders, profile and enquiries.**

```js
[
  'aph_products_v1',
  'aph_cart_v1',
  'aph_orders_v1',
  'aph_profile_v1',
  'aph_enquiries'
].forEach(key => localStorage.removeItem(key));
location.reload();
```

## Important demo limitations

- **No real payments:** payment labels are simulated. There is no M-Pesa integration, payment prompt, charge or money transfer.
- **No backend/database:** orders, stock, profiles and enquiries are browser-local. They are not shared with another device or a seller.
- **No authentication:** the admin workspace is intentionally open and is not a protected administration system. The profile form is not registration or login.
- **No real fulfilment:** checkout does not arrange delivery or collection. KSh 0 delivery is a demo value, not a shipping offer.
- **No verified inventory or fitment:** product prices, stock and compatibility are sample data. Images are illustrative, not a guarantee of a specific supplied product.
- **Use fictional details only:** do not enter real personal information or credentials into this public demo.

This source is complete for the static demonstration, not a finished production ecommerce system. A full implementation requires server-side validation, authenticated/authorized admin endpoints, a shared database, transactional order/stock updates, private customer-order access and operational security. The project proposal's Node.js/Express and SQLite/MySQL backend has not been implemented in this source.

## Image rights

The package includes the images used in the demo, including the supplied workshop photograph and illustrative product images. Inclusion is not a licence grant for third-party material. Confirm appropriate usage rights or replace product images with your own licensed assets before public/commercial use.

## Troubleshooting

- **Port already in use:** use `python3 -m http.server 8081` (or the Windows equivalent), then open `http://localhost:8081`. A new port has separate browser storage.
- **Images missing:** check that `assets` is beside `index.html` and that names and letter case match.
- **Old catalogue after editing:** see the seed-data and reset notes above.
- **No products after filtering:** click **Reset filters** and clear the search; vehicle and category filters can combine.
- **Browser errors:** check developer tools → Console and Network. Use a current browser with JavaScript enabled.
