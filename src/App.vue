<script setup>
import { ref } from "vue";
import MontagePanel from "./components/MontagePanel.vue";
import PhotoPicker from "./components/PhotoPicker.vue";
import SpeciesInput from "./components/SpeciesInput.vue";
import { opts, tiles, ui } from "./lib/state.js";

const baseUrl = import.meta.env.BASE_URL;
const version = __APP_VERSION__;
const main = ref(null);

// drag the divider to share the width between photos and montage
function startResize(e) {
  const el = e.currentTarget;
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* synthetic event */
  }
  const box = main.value.getBoundingClientRect();
  const move = (ev) => {
    const pct = ((ev.clientX - box.left) / box.width) * 100;
    opts.split = Math.round(Math.min(80, Math.max(25, pct)));
  };
  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
}
</script>

<template>
  <div class="app-shell">
    <nav class="navbar navbar-sm bg-white border-bottom py-1">
      <div class="container-fluid px-3 flex-nowrap">
        <a class="navbar-brand d-flex align-items-center gap-2 text-primary fw-semibold fs-6 py-0" :href="baseUrl">
          <img :src="`${baseUrl}favicon.svg`" alt="" width="20" height="20" />
          Species Photo Montage
        </a>
        <div class="d-flex align-items-center gap-3 small">
          <a
            class="link-secondary text-decoration-none d-none d-md-inline"
            href="https://www.inaturalist.org"
            target="_blank"
            rel="noopener"
            title="Photos and names from iNaturalist. Each photo keeps its own licence: check it before publishing your montage."
          >
            Photos from iNaturalist
          </a>
          <a class="link-secondary text-decoration-none d-none d-sm-inline" href="https://zoziologie.raphaelnussbaumer.com/">Zoziologie</a>
          <a class="link-secondary text-decoration-none" href="https://github.com/Zoziologie/photo-montage">
            <i class="bi bi-github" aria-hidden="true"></i><span class="d-none d-sm-inline"> GitHub</span>
          </a>
          <span class="text-body-tertiary d-none d-sm-inline">v{{ version }}</span>
        </div>
      </div>
    </nav>

    <main ref="main" class="panes" :class="[{ maximized: ui.maximized }, `tab-${ui.tab}`]">
      <div v-show="!ui.maximized" class="pane pane-photos" :style="{ '--split': opts.split + '%' }">
        <SpeciesInput />
        <PhotoPicker />
      </div>
      <div
        v-show="!ui.maximized"
        class="splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        title="Drag to resize, double-click to reset"
        @pointerdown.prevent="startResize"
        @dblclick="opts.split = 55"
      ></div>
      <div class="pane pane-montage">
        <MontagePanel />
      </div>
    </main>

    <!-- phones: switch between photos and montage -->
    <nav class="tabbar d-lg-none border-top bg-white" aria-label="View">
      <button type="button" :class="{ active: ui.tab === 'photos' }" @click="ui.tab = 'photos'">
        <i class="bi bi-images" aria-hidden="true"></i>Photos
      </button>
      <button type="button" :class="{ active: ui.tab === 'montage' }" @click="ui.tab = 'montage'">
        <i class="bi bi-grid-1x2" aria-hidden="true"></i>Montage
        <span v-if="tiles.length" class="badge text-bg-primary">{{ tiles.length }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}
.panes {
  flex: 1;
  min-height: 0;
  display: flex;
}
.pane {
  min-width: 0;
  padding: 0.75rem;
}
.pane-photos {
  flex: 0 0 var(--split);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.4rem;
}
.pane-montage {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-left: 0.4rem;
}
.maximized .pane-montage {
  padding-left: 0.75rem;
}
.splitter {
  flex: 0 0 8px;
  cursor: col-resize;
  touch-action: none;
  position: relative;
}
.splitter::after {
  content: "";
  position: absolute;
  inset: 0.75rem 3px;
  border-radius: 2px;
  background: var(--bs-border-color);
}
.splitter:hover::after {
  background: var(--bs-primary);
}

/* phones and small tablets: stack the panes and let the page scroll */
@media (max-width: 991.98px) {
  .app-shell {
    height: auto;
  }
  .panes {
    flex-direction: column;
  }
  .pane-photos {
    flex: none;
    overflow: visible;
    padding: 0.5rem 0.5rem 0;
  }
  .pane-montage {
    padding: 0.5rem;
  }
  .splitter {
    display: none;
  }
  .tab-photos .pane-montage,
  .tab-montage .pane-photos {
    display: none !important;
  }
  .panes {
    padding-bottom: 56px;
  }
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    height: 56px;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabbar button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 0;
    background: none;
    color: var(--bs-secondary-color);
    font-size: 0.9rem;
  }
  .tabbar button.active {
    color: var(--bs-primary);
    font-weight: 600;
    box-shadow: inset 0 3px 0 var(--bs-primary);
  }
}
</style>
