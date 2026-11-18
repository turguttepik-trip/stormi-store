/* Stormi — Canlı Deneme (sanal boyun ipi deneme)
   Kameradan omuz/boyun noktalarını tarayıcıda bulur (Google MediaPipe Pose, cihazda çalışır),
   seçilen boyun ipini boyna asar ve kişiyle birlikte hareket ettirir. Görüntü hiçbir yere gönderilmez. */
import { PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const $ = id => document.getElementById(id);
let landmarker = null, runMode = null, stream = null, raf = 0, opts = null;
let product = null, layer = null, smooth = null, lastSeen = 0, photo = null, mirrored = true;

async function getLandmarker(mode) {
  if (!landmarker) {
    const fs = await FilesetResolver.forVisionTasks(WASM);
    const make = delegate => PoseLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: mode, numPoses: 1,
      minPoseDetectionConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try { landmarker = await make("GPU"); } catch { landmarker = await make("CPU"); }
    runMode = mode;
  }
  if (runMode !== mode) { await landmarker.setOptions({ runningMode: mode }); runMode = mode; }
  return landmarker;
}

/* Ürün görselini hazırla: üst kısmı yumuşakça şeffaflaştır (ip boynun arkasından dolanıyormuş gibi) */
function prepareLayer(p) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      // Ürün fotoğrafında ip kancada asılı olduğu için halka dar; takılı ipte üst kısım boynun iki yanına açılır.
      // Görseli yatay dilimlere bölüp üst kısmı asılma noktası etrafında genişleterek V şekli veriyoruz.
      const w = img.naturalWidth, h = img.naturalHeight, hx0 = p.hx ?? 0.5;
      const K = 1.5, SPREAD = 0.5;            // en üstte genişleme katsayısı / etkilenen yükseklik oranı
      const c = document.createElement("canvas");
      c.width = Math.round(w * (1 + K)); c.height = h;
      const g = c.getContext("2d");
      const cx = c.width * 0.5, step = 2;
      for (let y = 0; y < h; y += step) {
        const t = Math.max(0, 1 - y / (h * SPREAD));
        const sx = 1 + K * Math.pow(t, 1.4);
        g.drawImage(img, 0, y, w, step, cx - hx0 * w * sx, y, w * sx, step);
      }
      g.globalCompositeOperation = "destination-in";
      const hy = p.hy || 0, fadeEnd = Math.min(0.32, hy + 0.2);
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(Math.max(0, hy + 0.04), "rgba(0,0,0,0)");
      grad.addColorStop(fadeEnd, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
      res({ canvas: c, hx: 0.5, hy: hy, ratio: h / w }); // ölçek, genişletilmemiş ürün oranına göre
    };
    img.onerror = rej;
    img.src = p.cut;
  });
}

/* Omuzlardan boyun noktasını, ölçeği ve açıyı hesapla; titremeyi yumuşat */
function solve(lm, w, h) {
  const P = i => ({ x: (mirrored ? 1 - lm[i].x : lm[i].x) * w, y: lm[i].y * h, v: lm[i].visibility ?? 1 });
  const L = P(11), R = P(12), N = P(0);
  if (L.v < 0.4 || R.v < 0.4) return null;
  const mid = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 };
  const sw = Math.hypot(R.x - L.x, R.y - L.y);
  if (sw < w * 0.08) return null;
  let ang = Math.atan2(R.y - L.y, R.x - L.x);
  if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
  // boyun dibi: omuz ortasından başa doğru biraz yukarı
  const up = N.v > 0.4 ? { x: N.x - mid.x, y: N.y - mid.y } : { x: Math.sin(ang) * sw, y: -Math.cos(ang) * sw };
  const neck = { x: mid.x + up.x * 0.18, y: mid.y + up.y * 0.18 };
  const t = { x: neck.x, y: neck.y, sw, ang };
  if (!smooth) smooth = t;
  else { const k = 0.38; for (const key of ["x", "y", "sw", "ang"]) smooth[key] += (t[key] - smooth[key]) * k; }
  return smooth;
}

function drawLanyard(g, s) {
  if (!layer || !s) return;
  const H = s.sw * 1.35, W = H / layer.ratio;              // ürünün kendi genişliği
  const Wc = W * (layer.canvas.width / (layer.canvas.height / layer.ratio)); // genişletilmiş tuval genişliği
  g.save();
  g.translate(s.x, s.y);
  g.rotate(s.ang);
  g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = s.sw * 0.04; g.shadowOffsetY = s.sw * 0.02;
  g.drawImage(layer.canvas, -0.5 * Wc, -layer.hy * H, Wc, H);
  g.restore();
}

function setStatus(text, kind = "") {
  const el = $("toStatus");
  el.textContent = text || "";
  el.className = "to-status " + kind;
  el.hidden = !text;
}

/* ---- Canlı kamera döngüsü ---- */
async function loopVideo() {
  const v = $("toVideo"), c = $("toCanvas"), g = c.getContext("2d");
  const lmk = await getLandmarker("VIDEO");
  let lastT = -1;
  const step = () => {
    if (!stream) return;
    if (v.readyState >= 2) {
      if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
      g.save(); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, 0, 0); g.restore();
      const now = performance.now();
      if (v.currentTime !== lastT) {
        lastT = v.currentTime;
        const r = lmk.detectForVideo(v, now);
        const lm = r.landmarks && r.landmarks[0];
        const s = lm ? solve(lm, c.width, c.height) : null;
        if (s) { lastSeen = now; setStatus(""); }
      }
      if (now - lastSeen < 600) drawLanyard(g, smooth);
      else { smooth = null; setStatus("Omuzlarının ve yüzünün kamerada göründüğünden emin ol", "hint"); }
    }
    raf = requestAnimationFrame(step);
  };
  step();
}

async function startCamera() {
  setStatus("Kamera açılıyor…");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    stream = null;
    setStatus("Kameraya erişilemedi. Bir fotoğraf yükleyerek deneyebilirsin.", "warn");
    $("tryon").classList.add("no-cam");
    return;
  }
  const v = $("toVideo");
  v.srcObject = stream; await v.play();
  mirrored = true; photo = null;
  $("tryon").classList.remove("no-cam", "is-photo");
  setStatus("Model yükleniyor…");
  await loopVideo();
}

function stopCamera() {
  cancelAnimationFrame(raf); raf = 0;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

/* ---- Fotoğraf modu (kamera yoksa ya da yüklenen fotoğraf) ---- */
async function renderPhoto() {
  if (!photo) return;
  const c = $("toCanvas"), g = c.getContext("2d");
  const scale = Math.min(1, 1280 / Math.max(photo.naturalWidth, photo.naturalHeight));
  c.width = Math.round(photo.naturalWidth * scale); c.height = Math.round(photo.naturalHeight * scale);
  g.drawImage(photo, 0, 0, c.width, c.height);
  const lmk = await getLandmarker("IMAGE");
  const r = lmk.detect(c);
  const lm = r.landmarks && r.landmarks[0];
  smooth = null; mirrored = false;
  const s = lm ? solve(lm, c.width, c.height) : null;
  if (s) { drawLanyard(g, s); setStatus(""); }
  else setStatus("Fotoğrafta omuzlar bulunamadı. Omuzların ve yüzün görünen önden bir fotoğraf dene.", "warn");
}
async function usePhoto(src) {
  stopCamera();
  $("tryon").classList.add("is-photo");
  setStatus("Fotoğraf işleniyor…");
  photo = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  await renderPhoto();
}

/* ---- Arayüz ---- */
function renderSide() {
  const list = opts.products;
  $("toTitle").textContent = opts.shortName(product);
  $("toPrice").textContent = opts.money(product.price);
  $("toSwatches").innerHTML = list.map(p => `<button class="to-sw ${p.slug === product.slug ? "on" : ""}" data-sw="${p.slug}" title="${p.name}">
    <img src="${p.cut}" alt=""></button>`).join("");
}
async function choose(slug) {
  product = opts.products.find(p => p.slug === slug) || product;
  layer = await prepareLayer(product);
  smooth = null;
  renderSide();
  if (photo) renderPhoto();
}

function snapshot() {
  const c = $("toCanvas");
  try {
    c.toBlob(b => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `stormi-deneme-${product.slug.slice(0, 30)}.png`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  } catch { setStatus("Bu görüntü kaydedilemedi.", "warn"); }
}

let wired = false;
function wire() {
  if (wired) return; wired = true;
  $("tryon").addEventListener("click", e => {
    const sw = e.target.closest("[data-sw]"); if (sw) return choose(sw.dataset.sw);
    const a = e.target.closest("[data-to]"); if (!a) return;
    if (a.dataset.to === "close") close();
    if (a.dataset.to === "snap") snapshot();
    if (a.dataset.to === "add") opts.onAdd(product.slug, $("toCanvas"));
    if (a.dataset.to === "camera") startCamera();
    if (a.dataset.to === "upload") $("toFile").click();
  });
  $("toFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    usePhoto(URL.createObjectURL(f)); e.target.value = "";
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("tryon").classList.contains("open")) { e.stopImmediatePropagation(); close(); } }, true);
}

export async function open(slug, options) {
  opts = options; wire();
  product = opts.products.find(p => p.slug === slug) || opts.products[0];
  $("tryon").classList.add("open"); $("tryon").setAttribute("aria-hidden", "false");
  document.body.classList.add("tryon-open");
  await choose(product.slug);
  if (options.testImage) return usePhoto(options.testImage);
  startCamera();
}
export function close() {
  stopCamera(); photo = null; smooth = null;
  $("tryon").classList.remove("open", "no-cam", "is-photo"); $("tryon").setAttribute("aria-hidden", "true");
  document.body.classList.remove("tryon-open");
  setStatus("");
}
