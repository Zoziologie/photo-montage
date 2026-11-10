# Species Photo Montage

A small web app to build a printable photo montage for a list of species, using openly licensed photos from [iNaturalist](https://www.inaturalist.org).

Part of the [Zoziologie](https://zoziologie.raphaelnussbaumer.com/) web apps.

## How it works

1. **Species**: paste a list, one species per line. If a line contains a scientific name, that name is used and anything else on the line (common names, extra columns) is ignored. Otherwise the whole line is searched on iNaturalist. Common names can be shown in several languages.
2. **Photos**: for each species, the app lists iNaturalist's featured photos plus the most-voted research-grade observation photos. Click as many photos as you like to add them to the montage, and use **Load more** for further batches.
3. **Montage**: choose a layout and page format, then fine-tune:
   - Layouts: **Grid**, **Justified rows** (uncropped photos, rows stretched to the full width) and **Featured first** (first photo twice as large)
   - Page: A4, A3, Letter, square or 16:9 slide, landscape or portrait
   - Label (common name, scientific name, both or none) and its position, text size, margin, gap, rounded corners, background colour, photo credits
   - Drag a photo in the preview to reframe it, scroll to zoom, double-click to reset
   - Drag the chips below the preview to reorder photos, or × to remove them
4. **Download** the montage as PNG or JPEG at 150, 300 or 600 dpi.

Settings and the species list are remembered in the browser (`localStorage`).

## Licences

Only photos that can legally be reused and modified (cropped) are listed:

- CC0, CC BY and CC BY-SA
- CC BY-NC and CC BY-NC-SA (optional, on by default): fine for talks, teaching and reports, not for commercial use

All-rights-reserved and "no derivatives" photos are never shown. Keep the **Photo credits** option on when you publish a montage: most licences require attribution.

## Development

Built with [Vue 3](https://vuejs.org/), [Vite](https://vite.dev/) and [Bootstrap 5](https://getbootstrap.com/), like the other Zoziologie apps.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/build_and_deploy.yml`), served at <https://zoziologie.raphaelnussbaumer.com/photo-montage/>. Set the repository variable `GA_MEASUREMENT_ID` to enable Google Analytics.

The app calls the public [iNaturalist API](https://api.inaturalist.org/v1/docs/) directly from the browser. Please keep usage reasonable (the API asks for about one request per second at most).

## Files

- `src/App.vue`: page layout, header
- `src/components/`: `SpeciesInput` (step 1), `PhotoPicker` (step 2), `MontagePanel` (step 3: options, preview, export)
- `src/lib/inat.js`: iNaturalist search, licence filter, photo loading
- `src/lib/layout.js`: page sizes and the grid, justified and featured layouts
- `src/lib/draw.js`: canvas drawing of photos, labels and credits
- `src/lib/state.js`: shared state and settings saved in `localStorage`

## License

GPL-3.0 © Raphaël Nussbaumer. Photos remain the property of their authors under their own licences.
