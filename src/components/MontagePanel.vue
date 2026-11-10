<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { drawMontage } from "@/lib/draw.js";
import { photoUrl } from "@/lib/inat.js";
import { LAYOUT_DPI, layout, page } from "@/lib/layout.js";
import { opts, setStatus, status, tiles, ui } from "@/lib/state.js";

const cv = ref(null);
const wrap = ref(null);
const stacked = window.matchMedia("(max-width: 991.98px)"); // panes stacked: fit width only

// ------------------------------------------------------------ preview, fitted to the space left in the pane
function draw() {
  const el = cv.value;
  if (!el || !wrap.value) return;
  const p = page(opts);
  const cs = getComputedStyle(wrap.value);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const boxW = (wrap.value.clientWidth || 600) - padX;
  const boxH = stacked.matches ? Infinity : (wrap.value.clientHeight || Infinity) - padY;
  const cssW = Math.max(50, Math.min(boxW, (boxH * p.W) / p.H));
  el.style.width = `${cssW}px`;
  el.style.height = `${(cssW * p.H) / p.W}px`;
  const scale = (cssW * (window.devicePixelRatio || 1)) / p.W;
  el.width = Math.round(p.W * scale);
  el.height = Math.round(p.H * scale);
  drawMontage(el.getContext("2d"), scale, tiles, opts);
}

let ro;
watch([opts, tiles, () => ui.maximized], () => nextTick(draw), { deep: true });
onMounted(() => {
  ro = new ResizeObserver(() => draw());
  ro.observe(wrap.value);
  document.fonts.ready.then(draw);
});
onBeforeUnmount(() => ro?.disconnect());

// ------------------------------------------------------------ reframe / zoom in the preview
function hit(e) {
  const r = cv.value.getBoundingClientRect(),
    p = page(opts);
  const x = ((e.clientX - r.left) / r.width) * p.W,
    y = ((e.clientY - r.top) / r.height) * p.H;
  return layout(tiles, opts).findIndex((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
}

let drag = null;
function onDown(e) {
  const i = hit(e);
  if (i < 0 || !tiles[i].img) return;
  drag = { i, x: e.clientX, y: e.clientY };
  cv.value.setPointerCapture(e.pointerId);
  cv.value.style.cursor = "grabbing";
}
function onMove(e) {
  if (!drag) return;
  const t = tiles[drag.i],
    im = t.img,
    q = layout(tiles, opts)[drag.i];
  const k = page(opts).W / cv.value.getBoundingClientRect().width; // screen px -> page px
  const s = Math.max(q.w / im.width, q.h / im.height) * t.z;
  const ex = im.width - q.w / s,
    ey = im.height - q.h / s; // croppable extent in image px
  if (ex > 0.5) t.fx = Math.min(1, Math.max(0, t.fx - ((e.clientX - drag.x) * k) / s / ex));
  if (ey > 0.5) t.fy = Math.min(1, Math.max(0, t.fy - ((e.clientY - drag.y) * k) / s / ey));
  drag.x = e.clientX;
  drag.y = e.clientY;
}
function onUp() {
  drag = null;
  cv.value.style.cursor = "grab";
}
function onWheel(e) {
  const i = hit(e);
  if (i < 0) return;
  e.preventDefault();
  const t = tiles[i];
  t.z = Math.min(5, Math.max(1, t.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
}
function onDblClick(e) {
  const i = hit(e);
  if (i >= 0) Object.assign(tiles[i], { fx: 0.5, fy: 0.5, z: 1 });
}

// ------------------------------------------------------------ reorder / remove
const dragFrom = ref(null);
const dragOver = ref(null);
function onDrop(to) {
  if (dragFrom.value !== null && to !== dragFrom.value) {
    const [t] = tiles.splice(dragFrom.value, 1);
    tiles.splice(to, 0, t);
  }
  dragFrom.value = dragOver.value = null;
}

// ------------------------------------------------------------ export
async function download() {
  if (!tiles.length) return setStatus("Select at least one photo.");
  if (tiles.some((t) => !t.img)) return setStatus("Some photos are still loading…");
  setStatus("Rendering…");
  await document.fonts.ready;
  const p = page(opts),
    scale = opts.dpi / LAYOUT_DPI,
    fmt = opts.format;
  const c = document.createElement("canvas");
  c.width = Math.round(p.W * scale);
  c.height = Math.round(p.H * scale);
  drawMontage(c.getContext("2d"), scale, tiles, opts);
  c.toBlob(
    (b) => {
      if (!b) return setStatus("Export failed (image too large for this browser?). Try a lower resolution.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `species-montage_${opts.paper}_${new Date().toISOString().slice(0, 10)}.${fmt === "png" ? "png" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Saved ${a.download} (${c.width}×${c.height} px, ${(b.size / 1e6).toFixed(1)} MB)`);
    },
    `image/${fmt}`,
    0.92,
  );
}
</script>

<template>
  <section class="card shadow-sm montage">
    <!-- header: main page settings always visible -->
    <div class="card-body py-2 d-flex flex-wrap align-items-center gap-2 border-bottom">
      <span class="step">3</span>
      <span class="fw-semibold me-1">Montage</span>
      <select v-model="opts.layout" class="form-select form-select-sm w-auto" title="Layout" aria-label="Layout">
        <option value="grid">Grid</option>
        <option value="justified">Justified rows</option>
        <option value="featured">Featured first</option>
      </select>
      <select v-model="opts.paper" class="form-select form-select-sm w-auto" title="Page" aria-label="Page">
        <option value="A4">A4</option>
        <option value="A3">A3</option>
        <option value="Letter">Letter</option>
        <option value="Square">Square</option>
        <option value="Slide">Slide 16:9</option>
      </select>
      <div class="btn-group btn-group-sm" role="group" aria-label="Orientation">
        <button
          type="button"
          class="btn btn-outline-secondary"
          :class="{ active: opts.orient === 'L' }"
          title="Landscape"
          @click="opts.orient = 'L'"
        >
          <i class="bi bi-file-earmark rot" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          :class="{ active: opts.orient === 'P' }"
          title="Portrait"
          @click="opts.orient = 'P'"
        >
          <i class="bi bi-file-earmark" aria-hidden="true"></i>
        </button>
      </div>
      <div class="ms-auto d-flex gap-1">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :class="{ active: opts.showOptions }"
          title="More options"
          @click="opts.showOptions = !opts.showOptions"
        >
          <i class="bi bi-sliders" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary d-none d-lg-inline-block"
          :title="ui.maximized ? 'Show photos' : 'Enlarge preview'"
          @click="ui.maximized = !ui.maximized"
        >
          <i class="bi" :class="ui.maximized ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- secondary options, collapsible -->
    <div v-show="opts.showOptions" class="options card-body py-2 border-bottom small">
      <label>
        Columns
        <select v-model.number="opts.cols" class="form-select form-select-sm">
          <option :value="0">Auto</option>
          <option v-for="c in 8" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label>
        Label
        <select v-model="opts.label" class="form-select form-select-sm">
          <option value="common">Common name</option>
          <option value="sci">Scientific name</option>
          <option value="both">Both</option>
          <option value="none">None</option>
        </select>
      </label>
      <label>
        Position
        <select v-model="opts.labelpos" class="form-select form-select-sm">
          <option value="bl">Bottom left</option>
          <option value="bc">Bottom centre</option>
          <option value="tl">Top left</option>
        </select>
      </label>
      <label>
        Text %
        <input v-model.number="opts.fs" type="number" min="30" max="300" step="10" class="form-control form-control-sm" />
      </label>
      <label>
        Margin mm
        <input v-model.number="opts.mar" type="number" min="0" max="40" class="form-control form-control-sm" />
      </label>
      <label>
        Gap mm
        <input v-model.number="opts.gap" type="number" min="0" max="20" class="form-control form-control-sm" />
      </label>
      <label>
        Corners mm
        <input v-model.number="opts.radius" type="number" min="0" max="20" class="form-control form-control-sm" />
      </label>
      <label>
        Background
        <input v-model="opts.bg" type="color" class="form-control form-control-sm form-control-color w-100" />
      </label>
      <div class="form-check align-self-end mb-1">
        <input id="cred" v-model="opts.cred" class="form-check-input" type="checkbox" />
        <label class="form-check-label" for="cred">Credits</label>
      </div>
    </div>

    <!-- preview fills the remaining height -->
    <div ref="wrap" class="preview-wrap">
      <canvas
        ref="cv"
        class="preview"
        aria-label="Montage preview"
        title="Drag a photo to reframe it, scroll to zoom, double-click to reset"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @wheel="onWheel"
        @dblclick="onDblClick"
      ></canvas>
    </div>

    <!-- selected photos: one scrollable row -->
    <div v-if="tiles.length" class="chips px-2 pt-2">
      <div
        v-for="(t, i) in tiles"
        :key="t.photo.id"
        class="chip"
        :class="{ over: dragOver === i }"
        draggable="true"
        :title="`${i + 1}. ${t.taxon.common} (drag to reorder)`"
        @dragstart="dragFrom = i"
        @dragover.prevent="dragOver = i"
        @drop.prevent="onDrop(i)"
        @dragend="dragFrom = dragOver = null"
      >
        <img :src="photoUrl(t.photo, 'square')" alt="" />
        <span class="chip-n">{{ i + 1 }}</span>
        <button type="button" :aria-label="`Remove ${t.taxon.common}`" @click="tiles.splice(i, 1)">
          <i class="bi bi-x" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- export -->
    <div class="card-body py-2 d-flex flex-wrap align-items-center gap-2">
      <span class="status small text-body-secondary text-truncate" role="status">
        {{ status.text || (tiles.length ? "Drag to reframe, scroll to zoom, double-click to reset." : "") }}
      </span>
      <select v-model.number="opts.dpi" class="form-select form-select-sm w-auto" aria-label="Resolution">
        <option :value="150">150 dpi</option>
        <option :value="300">300 dpi</option>
        <option :value="600">600 dpi</option>
      </select>
      <select v-model="opts.format" class="form-select form-select-sm w-auto" aria-label="Format">
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
      </select>
      <button class="btn btn-primary btn-sm" @click="download">
        <i class="bi bi-download me-1" aria-hidden="true"></i>Download
      </button>
    </div>
  </section>
</template>

<style scoped>
.montage {
  flex: 1;
  min-height: 0;
}
/* Bootstrap card bodies grow by default: keep toolbars at their natural height */
.montage > .card-body {
  flex: none;
}
.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 0.4rem 0.6rem;
}
.options label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--bs-secondary-color);
}
.status {
  flex: 1 1 0;
  min-width: 0;
}
.rot {
  display: inline-block;
  transform: rotate(90deg);
}
.preview-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: repeating-conic-gradient(#eef1ef 0 25%, #f7f8f7 0 50%) 0 0 / 16px 16px;
  overflow: hidden;
}
.preview {
  display: block;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
  cursor: grab;
  touch-action: none;
}
.chips {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-top: 1px solid var(--bs-border-color);
}
.chip {
  position: relative;
  flex: 0 0 auto;
  height: 44px;
  width: 58px;
  border-radius: 4px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  outline: 2px solid transparent;
  outline-offset: -2px;
}
.chip img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.chip-n {
  position: absolute;
  left: 2px;
  bottom: 2px;
  padding: 0 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}
.chip button {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 18px;
  height: 18px;
  padding: 0;
  line-height: 1;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  opacity: 0;
}
.chip:hover button,
.chip button:focus-visible {
  opacity: 1;
}
.chip.over {
  outline-color: var(--bs-primary);
}
@media (max-width: 991.98px) {
  .preview-wrap {
    flex: none;
  }
  .chip button {
    opacity: 1;
  }
}
</style>
