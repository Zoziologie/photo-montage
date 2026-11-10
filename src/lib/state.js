// Shared app state: options (persisted in localStorage), species list and selected tiles.
import { reactive, watch } from "vue";

const STORE_KEY = "species-montage-v1"; // same key as the pre-Vue version, so saved settings carry over

export const DEFAULTS = {
  list: "",
  locale: "en",
  nper: 24,
  nc: true,
  layout: "grid",
  paper: "A4",
  orient: "L",
  cols: 0,
  label: "common",
  labelpos: "bl",
  fs: 100,
  mar: 5,
  gap: 2,
  radius: 0,
  bg: "#ffffff",
  cred: true,
  dpi: 300,
  format: "png",
  thumb: 120, // thumbnail row height in px
  split: 55, // width of the photos pane, in % of the window
  showOptions: true,
};

function load() {
  try {
    const o = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (!(k in o)) continue;
      // older versions stored select/number values as strings
      out[k] = typeof DEFAULTS[k] === "number" ? Number(o[k]) : o[k];
    }
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export const opts = reactive(load());

watch(
  opts,
  () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(opts));
    } catch {
      /* storage unavailable */
    }
  },
  { deep: true },
);

// [{query, taxon:{id,name,common}, photos:[], page, done, loading}]
export const species = reactive([]);
// [{photo, taxon, fx, fy, z, img}]  (img is a markRaw ImageBitmap)
export const tiles = reactive([]);

export const status = reactive({ text: "" });
// transient UI state (not saved)
export const ui = reactive({ maximized: false, editList: true, tab: "photos" }); // tab: phones only
export const setStatus = (t) => (status.text = t);
