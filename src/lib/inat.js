// iNaturalist API helpers.
import { markRaw } from "vue";

const API = "https://api.inaturalist.org/v1";

const getJSON = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`iNaturalist API ${r.status}`);
    return r.json();
  });

// "(c) Jane Doe, some rights reserved (CC BY-NC), uploaded by Jane" -> "© Jane Doe (CC BY-NC)"
const cleanAttribution = (a) =>
  (a || "")
    .replace(/, uploaded by.*$/, "")
    .replace("some rights reserved ", "")
    .replace(", (", " (")
    .replace("(c) ", "© ");

// All-rights-reserved photos cannot be exported (no CORS on their server, and no reuse licence).
// "No derivatives" licences are excluded because the montage crops photos.
const allowedLicence = (lic, nc) => !!lic && !/nd/.test(lic) && (!/nc/.test(lic) || nc);

const toPhoto = (p) => ({
  id: p.id,
  licence: p.license_code,
  credit: cleanAttribution(p.attribution),
  url: p.url.replace(/\/(square|small|medium|large|original)\./, "/SIZE."),
  aspect: p.original_dimensions ? p.original_dimensions.width / p.original_dimensions.height : 1.5,
});

export const photoUrl = (photo, size) => photo.url.replace("SIZE", size);

// Use a scientific name if one is found in the line, otherwise search the whole line
export function parseLine(line) {
  const m = line.match(/\b[A-Z][a-z]+ [a-z]{3,}(?: [a-z]{3,})?\b/);
  return m
    ? m[0]
    : line
        .replace(/[\d.,%]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export async function findTaxon(query, locale) {
  const r = await getJSON(
    `${API}/taxa?q=${encodeURIComponent(query)}&per_page=10&is_active=true&locale=${locale}`,
  );
  const t =
    r.results.find((t) => t.name.toLowerCase() === query.toLowerCase()) ||
    r.results.find((t) => t.rank === "species") ||
    r.results[0];
  return t ? { id: t.id, name: t.name, common: t.preferred_common_name || t.name } : null;
}

// Curated taxon photos on the first call, then pages of most-voted research-grade observations
export async function loadPhotos(sp, { nper, nc }, first = false) {
  const seen = new Set(sp.photos.map((p) => p.id));
  const add = (p) => {
    if (allowedLicence(p.license_code, nc) && !seen.has(p.id)) {
      seen.add(p.id);
      sp.photos.push(toPhoto(p));
    }
  };
  if (first) {
    const t = (await getJSON(`${API}/taxa/${sp.taxon.id}`)).results[0];
    t.taxon_photos.forEach((tp) => add(tp.photo));
  }
  const licences = ["cc0", "cc-by", "cc-by-sa"].concat(nc ? ["cc-by-nc", "cc-by-nc-sa"] : []);
  sp.page += 1;
  const r = await getJSON(
    `${API}/observations?taxon_id=${sp.taxon.id}&quality_grade=research&photos=true` +
      `&photo_license=${licences.join(",")}&order_by=votes&per_page=${nper}&page=${sp.page}`,
  );
  r.results.forEach((o) => o.photos.slice(0, 2).forEach(add));
  sp.done = r.results.length < nper;
}

// Full-resolution bitmap for drawing; markRaw keeps Vue from proxying it (drawImage rejects proxies)
export async function loadBitmap(photo) {
  for (const size of ["original", "large"]) {
    const blob = await fetch(photoUrl(photo, size))
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    if (blob) return markRaw(await createImageBitmap(blob));
  }
  return null;
}
