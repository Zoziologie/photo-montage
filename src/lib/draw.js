// Draw the montage on a canvas context. `scale` maps layout pixels (300 dpi) to canvas pixels.
import { layout, page } from "./layout.js";

const LABEL_FONT = '"Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SCI_FONT = '"Lato", "Helvetica Neue", Helvetica, Arial, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawMontage(ctx, scale, tiles, o) {
  const p = page(o),
    rects = layout(tiles, o);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, p.W, p.H);
  if (!tiles.length) {
    ctx.fillStyle = "#9aa6a3";
    ctx.font = `600 70px ${LABEL_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Select photos to build your montage", p.W / 2, p.H / 2);
    ctx.textAlign = "left";
    return;
  }
  // one text size for the whole page, based on the average tile size
  const meanSide = Math.sqrt(rects.reduce((s, r) => s + r.w * r.h, 0) / rects.length);
  const fs = meanSide * 0.06 * (o.fs / 100);
  const labelMode = o.label,
    pos = o.labelpos,
    credits = o.cred;

  tiles.forEach((t, i) => {
    const { x, y, w, h } = rects[i];
    ctx.save();
    roundRect(ctx, x, y, w, h, p.R);
    ctx.clip();

    if (t.img) {
      const im = t.img,
        s = Math.max(w / im.width, h / im.height) * t.z,
        sw = w / s,
        sh = h / s;
      ctx.drawImage(im, (im.width - sw) * t.fx, (im.height - sh) * t.fy, sw, sh, x, y, w, h);
    } else {
      ctx.fillStyle = "#dce3df";
      ctx.fillRect(x, y, w, h);
    }

    const lines = [];
    if (labelMode === "common" || labelMode === "both")
      lines.push({ text: t.taxon.common, font: (k) => `700 ${k}px ${LABEL_FONT}`, size: 1 });
    if (labelMode === "sci" || labelMode === "both")
      lines.push({
        text: t.taxon.name,
        font: (k) => `italic ${labelMode === "sci" ? 700 : 400} ${k}px ${SCI_FONT}`,
        size: labelMode === "both" ? 0.7 : 1,
      });
    const cfs = Math.max(12, fs * 0.32);
    const pad = fs * 0.55;

    // shade behind the text
    const top = pos === "tl";
    const shade = Math.min(h, fs * (1.2 + 1.1 * lines.length));
    if (lines.length) {
      const g = ctx.createLinearGradient(0, top ? y : y + h - shade, 0, top ? y + shade : y + h);
      g.addColorStop(top ? 1 : 0, "rgba(0,0,0,0)");
      g.addColorStop(top ? 0 : 1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(x, top ? y : y + h - shade, w, shade);
    }
    if (credits) {
      const g = ctx.createLinearGradient(0, y + h - cfs * 2.4, 0, y + h);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y + h - cfs * 2.4, w, cfs * 2.4);
    }

    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = fs * 0.15;
    ctx.textAlign = pos === "bc" ? "center" : "left";
    const tx = pos === "bc" ? x + w / 2 : x + pad;
    const bottomReserve = credits && pos !== "tl" ? cfs * 1.4 : 0;
    // stack lines from the anchor edge
    let ty = top ? y + pad : y + h - pad - bottomReserve;
    const ordered = top ? lines : [...lines].reverse();
    ordered.forEach((ln) => {
      let k = fs * ln.size;
      ctx.font = ln.font(k);
      const maxW = w - 2 * pad;
      const tw = ctx.measureText(ln.text).width;
      if (tw > maxW) {
        k *= maxW / tw; // shrink long names to fit
        ctx.font = ln.font(k);
      }
      ctx.textBaseline = top ? "top" : "alphabetic";
      ctx.fillText(ln.text, tx, ty);
      ty += (top ? 1 : -1) * k * 1.2;
    });

    if (credits) {
      ctx.font = `${cfs}px ${SCI_FONT}`;
      ctx.globalAlpha = 0.9;
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.shadowBlur = cfs * 0.2;
      ctx.fillText(t.photo.credit, x + w - cfs * 0.8, y + h - cfs * 0.7);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  });
  ctx.textAlign = "left";
}
