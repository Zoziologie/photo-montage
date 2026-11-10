<script setup>
import { computed } from "vue";
import { loadBitmap, loadPhotos, photoUrl } from "@/lib/inat.js";
import { opts, setStatus, species, tiles } from "@/lib/state.js";

// photo id -> position in the montage
const position = computed(() => new Map(tiles.map((t, i) => [t.photo.id, i])));
const nSelected = (sp) => tiles.filter((t) => t.taxon.id === sp.taxon.id).length;
// "small" is 240 px on the long side: use "medium" (500 px) once thumbnails get large
const thumbSize = computed(() => (opts.thumb * (window.devicePixelRatio || 1) > 240 ? "medium" : "small"));

async function more(sp) {
  sp.loading = true;
  await loadPhotos(sp, opts).catch((e) => setStatus(e.message));
  sp.loading = false;
}

async function toggle(sp, photo) {
  const k = position.value.get(photo.id);
  if (k !== undefined) {
    tiles.splice(k, 1);
    return;
  }
  // insert after the last photo of the same species, otherwise at the end
  const last = tiles.map((t) => t.taxon.id).lastIndexOf(sp.taxon.id);
  const at = last >= 0 ? last + 1 : tiles.length;
  tiles.splice(at, 0, { photo, taxon: sp.taxon, fx: 0.5, fy: 0.5, z: 1, img: null });
  const tile = tiles[at]; // the reactive proxy, so the canvas redraws when the image arrives
  const img = await loadBitmap(photo);
  if (!img) return setStatus(`Could not load photo ${photo.id}`);
  tile.img = img;
  tile.photo.aspect = img.width / img.height;
}

// justified rows: each thumbnail grows in proportion to its aspect ratio
const thumbStyle = (p) => ({ flex: `${p.aspect} 1 ${p.aspect * opts.thumb}px`, height: `${opts.thumb}px` });
</script>

<template>
  <section class="card shadow-sm flex-grow-1">
    <div class="photos-head card-body py-2 d-flex align-items-center gap-2 border-bottom">
      <span class="step">2</span>
      <span class="fw-semibold">Photos</span>
      <i
        class="bi bi-info-circle text-body-secondary small"
        title="Click photos to add them to the montage, as many per species as you like. Click again to remove. Only CC0, CC BY, CC BY-SA (and optionally CC BY-NC / BY-NC-SA) photos are listed."
      ></i>
      <span v-if="tiles.length" class="badge text-bg-primary">{{ tiles.length }} selected</span>
      <label class="ms-auto d-flex align-items-center gap-1 small text-body-secondary" title="Thumbnail size">
        <i class="bi bi-image small" aria-hidden="true"></i>
        <input v-model.number="opts.thumb" type="range" min="60" max="320" step="10" class="form-range size-range" />
        <i class="bi bi-image fs-5" aria-hidden="true"></i>
      </label>
    </div>

    <div class="card-body pt-0 px-2 pb-2">
      <p v-if="!species.length" class="fst-italic text-body-secondary mt-2 mb-0">
        Search for species to see photos.
      </p>

      <div v-for="(sp, si) in species" :key="si" class="sp">
        <div class="sp-head d-flex flex-wrap align-items-baseline gap-2">
          <template v-if="!sp.taxon">
            <span class="fw-semibold text-danger">{{ sp.query }}</span>
            <span class="small text-body-secondary">
              {{ sp.loading ? "searching…" : "not found on iNaturalist, edit the list and search again" }}
            </span>
          </template>
          <template v-else>
            <span class="fw-semibold">{{ sp.taxon.common }}</span>
            <i class="small text-body-secondary">{{ sp.taxon.name }}</i>
            <span class="small text-body-secondary">
              {{ sp.photos.length }}<template v-if="nSelected(sp)"> · {{ nSelected(sp) }} selected</template>
              ·
              <a
                class="link-secondary"
                :href="`https://www.inaturalist.org/taxa/${sp.taxon.id}`"
                target="_blank"
                rel="noopener"
                >iNat</a
              >
            </span>
          </template>
        </div>

        <div v-if="sp.taxon" class="thumbs">
          <button
            v-for="p in sp.photos"
            :key="p.id"
            type="button"
            class="thumb"
            :class="{ on: position.has(p.id) }"
            :style="thumbStyle(p)"
            :title="p.credit"
            @click="toggle(sp, p)"
          >
            <img loading="lazy" :src="photoUrl(p, thumbSize)" alt="" />
            <span v-if="position.has(p.id)" class="n">{{ position.get(p.id) + 1 }}</span>
            <span v-if="opts.thumb >= 100" class="cr">{{ p.credit }}</span>
          </button>
          <button
            v-if="!sp.done"
            type="button"
            class="more btn btn-outline-secondary btn-sm"
            :style="{ height: `${opts.thumb}px` }"
            :disabled="sp.loading"
            @click="more(sp)"
          >
            <span v-if="sp.loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <template v-else><i class="bi bi-plus-lg d-block" aria-hidden="true"></i>More</template>
          </button>
          <!-- absorbs the leftover space so the last row is not stretched -->
          <span class="filler"></span>
          <span v-if="!sp.photos.length && !sp.loading" class="fst-italic small text-body-secondary">
            No openly licensed photos found.
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.photos-head {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--bs-body-bg);
  border-radius: var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0 0;
}
.size-range {
  width: 110px;
}
.sp-head {
  position: sticky;
  top: 46px;
  z-index: 2;
  background: var(--bs-body-bg);
  padding: 0.4rem 0.25rem 0.3rem;
}
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.thumb {
  position: relative;
  max-width: 100%;
  padding: 0;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bs-border-color);
}
.thumb::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 4px;
  box-shadow: inset 0 0 0 3px transparent;
  pointer-events: none;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb:hover::after {
  box-shadow: inset 0 0 0 3px var(--primary-soft);
}
.thumb.on::after {
  box-shadow: inset 0 0 0 4px var(--bs-primary);
}
.thumb.on img {
  opacity: 0.85;
}
.thumb .n {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 1;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--bs-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  text-align: center;
}
.thumb .cr {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 5px 2px;
  font-size: 9px;
  color: #fff;
  text-align: left;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.15s;
}
.thumb:hover .cr {
  opacity: 1;
}
.more {
  flex: 0 0 64px;
  font-size: 12px;
}
.filler {
  flex: 1000 1 0;
}
</style>
