<script setup>
import { computed, ref } from "vue";
import { findTaxon, loadPhotos, parseLine } from "@/lib/inat.js";
import { opts, setStatus, species, tiles, ui } from "@/lib/state.js";

const LOCALES = [
  ["en", "English"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["es", "Spanish"],
  ["pt", "Portuguese"],
  ["nl", "Dutch"],
];

const busy = ref(false);
const nFound = computed(() => species.filter((s) => s.taxon).length);
const nMissing = computed(() => species.filter((s) => !s.taxon && !s.loading).length);

async function search() {
  const lines = opts.list
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.length) return;
  species.splice(
    0,
    species.length,
    ...lines.map((l) => ({
      query: parseLine(l),
      taxon: null,
      photos: [],
      page: 0,
      done: false,
      loading: true,
    })),
  );
  ui.editList = false; // collapse the list to leave room for the photos
  busy.value = true;
  setStatus("");
  for (const sp of species) {
    try {
      sp.taxon = await findTaxon(sp.query, opts.locale);
      if (sp.taxon) await loadPhotos(sp, opts, true);
    } catch (e) {
      setStatus(e.message);
    }
    sp.loading = false;
  }
  busy.value = false;
  // refresh names of photos already in the montage (e.g. after changing language)
  tiles.forEach((t) => {
    const sp = species.find((s) => s.taxon?.id === t.taxon.id);
    if (sp) t.taxon = sp.taxon;
  });
}

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") search();
}
</script>

<template>
  <section class="card shadow-sm flex-shrink-0">
    <!-- collapsed: one line summary -->
    <div v-if="!ui.editList" class="card-body py-2 d-flex align-items-center gap-2">
      <span class="step">1</span>
      <span class="fw-semibold">Species</span>
      <span class="small text-body-secondary text-truncate">
        <template v-if="busy">searching {{ species.length }} species…</template>
        <template v-else>
          {{ nFound }} found<template v-if="nMissing">, <span class="text-danger">{{ nMissing }} not found</span></template>
        </template>
      </span>
      <button class="btn btn-outline-secondary btn-sm ms-auto" @click="ui.editList = true">
        <i class="bi bi-pencil me-1" aria-hidden="true"></i>Edit list
      </button>
    </div>

    <!-- expanded: list and search options -->
    <div v-else class="card-body py-2">
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="step">1</span>
        <span class="fw-semibold">Species</span>
        <i
          class="bi bi-info-circle text-body-secondary small"
          title="One species per line. A scientific name anywhere in the line is used if found (extra columns are ignored), otherwise the whole line is searched on iNaturalist."
        ></i>
        <button
          v-if="species.length"
          class="btn btn-link btn-sm ms-auto text-body-secondary p-0"
          aria-label="Collapse"
          @click="ui.editList = false"
        >
          <i class="bi bi-chevron-up" aria-hidden="true"></i>
        </button>
      </div>
      <textarea
        v-model="opts.list"
        class="form-control font-monospace small"
        rows="5"
        spellcheck="false"
        placeholder="One species per line, e.g.&#10;Eurasian Collared-Dove Streptopelia decaocto&#10;Zenaida aurita&#10;Ruddy Ground Dove"
        @keydown="onKey"
      ></textarea>
      <div class="d-flex flex-wrap align-items-center gap-2 mt-2 small">
        <label class="d-flex align-items-center gap-1" for="locale">
          Names
          <select id="locale" v-model="opts.locale" class="form-select form-select-sm w-auto">
            <option v-for="[v, l] in LOCALES" :key="v" :value="v">{{ l }}</option>
          </select>
        </label>
        <label class="d-flex align-items-center gap-1" for="nper">
          Batch
          <input
            id="nper"
            v-model.number="opts.nper"
            type="number"
            min="6"
            max="200"
            class="form-control form-control-sm num"
          />
        </label>
        <div class="form-check mb-0">
          <input id="nc" v-model="opts.nc" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="nc" title="CC BY-NC and CC BY-NC-SA: fine for talks, teaching and reports, not for commercial use">
            Non-commercial licences
          </label>
        </div>
        <button class="btn btn-primary btn-sm ms-auto" :disabled="busy" title="Ctrl/⌘ + Enter" @click="search">
          <span v-if="busy" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          <i v-else class="bi bi-search me-1" aria-hidden="true"></i>
          Search
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.num {
  width: 70px;
}
</style>
