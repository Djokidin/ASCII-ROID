'use strict';

/* ══════════════════════════════════════════════
   DITHEROID — ASCII Camera · app.js
   ══════════════════════════════════════════════ */

/* ── QUOTES ── */
const QUOTES_ID = [
  "hidup", "bukan", "tentang", "menemukan", "dirimu", "melainkan", "menciptakannya",
  "jadilah", "dirimu", "sendiri", "karena", "semua", "orang", "lain", "sudah", "ada",
  "setiap", "hari", "adalah", "kesempatan", "baru", "untuk", "menjadi", "lebih", "baik",
  "keberanian", "bukan", "berarti", "tidak", "takut", "tapi", "terus", "melangkah", "meski", "gentar",
  "mimpi", "tidak", "akan", "bekerja", "kecuali", "kamu", "bekerja", "keras",
  "sukses", "adalah", "perjalanan", "bukan", "tujuan", "akhir",
  "belajar", "dari", "kemarin", "hidup", "untuk", "hari", "ini", "berharap", "untuk", "esok",
  "kegagalan", "adalah", "guru", "terbaik", "dalam", "hidupmu",
  "waktu", "tidak", "menunggu", "siapapun", "gunakan", "sebaik", "mungkin",
  "cinta", "diri", "sendiri", "adalah", "fondasi", "kebahagiaan", "sejati",
  "setiap", "badai", "pasti", "berlalu", "tetaplah", "berdiri", "tegak",
  "kesabaran", "adalah", "kunci", "menuju", "kesuksesan", "yang", "langgeng",
  "perubahan", "dimulai", "dari", "langkah", "kecil", "yang", "konsisten",
  "hiduplah", "sepenuh", "hati", "karena", "detik", "ini", "tidak", "akan", "terulang",
  "percayalah", "pada", "prosesmu", "sendiri", "hasilnya", "tidak", "akan", "mengkhianati",
  "orang", "kuat", "bukan", "yang", "tidak", "pernah", "jatuh", "tapi", "yang", "selalu", "bangkit",
];

const QUOTES_EN = [
  "life", "is", "not", "about", "finding", "yourself", "but", "creating", "yourself",
  "be", "yourself", "because", "everyone", "else", "is", "already", "taken",
  "every", "day", "is", "a", "new", "chance", "to", "be", "a", "better", "version",
  "courage", "is", "not", "the", "absence", "of", "fear", "but", "acting", "despite", "it",
  "dreams", "don't", "work", "unless", "you", "do",
  "don't", "count", "the", "days", "make", "the", "days", "count",
  "success", "is", "a", "journey", "not", "a", "destination",
  "learn", "from", "yesterday", "live", "for", "today", "hope", "for", "tomorrow",
  "failure", "is", "the", "best", "teacher", "in", "your", "life",
  "time", "waits", "for", "no", "one", "use", "it", "wisely",
  "self", "love", "is", "the", "foundation", "of", "true", "happiness",
  "every", "storm", "runs", "out", "of", "rain", "stand", "tall", "and", "keep", "going",
  "turn", "your", "obstacles", "into", "stepping", "stones", "not", "stumbling", "blocks",
  "strength", "is", "not", "about", "never", "falling", "but", "always", "rising",
  "choose", "happiness", "every", "day", "because", "it", "is", "always", "your", "choice",
];

/* ── STATE ── */
const state = {
  stream: null,
  animId: null,
  lastTime: 0,
  FPS: 12,              // hardcoded
  mirrored: true,
  contrast: 3.0,        // max contrast, hardcoded
  lang: 'both',
  running: false,
  wordPool: [],
  wordIdx: 0,
  showBgCam: false,
  invertAscii: false,
  facingMode: 'user',
  showText: true,
};

/* ── DOM ── */
const video = document.getElementById('video');
const captureCanvas = document.getElementById('captureCanvas');
const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
const asciiText = document.getElementById('asciiText');
const overlayMsg = document.getElementById('overlayMsg');
const cameraOff = document.getElementById('cameraOff');
const liveBadge = document.getElementById('liveBadge');
const lightbox = document.getElementById('lightbox');
const lightboxCanvas = document.getElementById('lightboxCanvas');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxBg = document.getElementById('lightboxBg');
const btnShare = document.getElementById('btnShare');
const toast = document.getElementById('toast');

const btnCamera = document.getElementById('btnCamera');
const btnFlip = document.getElementById('btnFlip');
const btnSwitchCam = document.getElementById('btnSwitchCam');
const btnBgCam = document.getElementById('btnBgCam');
const btnToggleText = document.getElementById('btnToggleText');
const btnInvert = document.getElementById('btnInvert');
const bgVideoCanvas = document.getElementById('bgVideoCanvas');
const bgVideoCtx = bgVideoCanvas ? bgVideoCanvas.getContext('2d', { willReadFrequently: true }) : null;
const btnSnapshot = document.getElementById('btnSnapshot');
const btnDownload = document.getElementById('btnDownload');
const btnPrint = document.getElementById('btnPrint');
const btnFullscreen = document.getElementById('btnFullscreen');
const asciiFrame = document.querySelector('.ascii-frame');
const selLang = document.getElementById('selLang');


/* ── WORD POOL ── */
/* ── SEQUENTIAL TEXT ── */
let sequentialText = "";
let seqIdx = 0;

function buildPool() {
  let pool = [];
  if (state.lang === 'id' || state.lang === 'both') pool = pool.concat(QUOTES_ID);
  if (state.lang === 'en' || state.lang === 'both') pool = pool.concat(QUOTES_EN);
  
  // Create a continuous sentence separated by spaces, no shuffling, uppercase for receipt look
  sequentialText = pool.join(" ").toUpperCase() + " ";
}

/* ── CHAR METRICS — dinamis berdasarkan ukuran layar ── */
function isMobileScreen() {
  return window.innerWidth <= 768;
}
function getFontSize() {
  // Harus cocok dengan CSS .ascii-out font-size
  if (isMobileScreen()) return 20;
  return 20;
}
function getCharW() {
  // VT323 advance width ratio: ~0.4 × font-size (empiris)
  if (isMobileScreen()) return 8.0;  // 20 × 0.4
  return 8.0;                         // 20 × 0.4
}
function getLineH() {
  return getFontSize(); // line-height = font-size (1.0)
}

/* ── RENDER ── */
function renderFrame(ts) {
  if (!state.running) return;

  const interval = 1000 / state.FPS;
  if (ts - state.lastTime < interval) {
    state.animId = requestAnimationFrame(renderFrame);
    return;
  }
  state.lastTime = ts;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) { state.animId = requestAnimationFrame(renderFrame); return; }

  // Fill the portrait frame exactly — 1 char per camera pixel
  const frameW = asciiFrame ? asciiFrame.offsetWidth : 340;
  const frameH = asciiFrame ? asciiFrame.offsetHeight : 453;

  const CHAR_W = getCharW();
  const LINE_H = getLineH();
  const cols = Math.floor(frameW / CHAR_W);
  const rows = Math.floor(frameH / LINE_H);
  
  // Calculate crop for object-fit: cover
  const frameAspect = frameW / frameH;
  let sx, sy, sw, sh;
  if ((vw / vh) > frameAspect) {
    sh = vh;
    sw = vh * frameAspect;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    sw = vw;
    sh = vw / frameAspect;
    sx = 0;
    sy = (vh - sh) / 2;
  }

  // Sample the camera at exactly cols × rows pixels
  captureCanvas.width = cols;
  captureCanvas.height = rows;

  captureCtx.save();
  if (state.mirrored) { captureCtx.translate(cols, 0); captureCtx.scale(-1, 1); }
  captureCtx.filter = `contrast(${state.contrast}) brightness(1.05)`;
  captureCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
  captureCtx.restore();

  // Background camera rendering
  if (state.showBgCam && bgVideoCtx) {
    bgVideoCanvas.width = frameW;
    bgVideoCanvas.height = frameH;
    bgVideoCtx.save();
    if (state.mirrored) {
      bgVideoCtx.translate(frameW, 0);
      bgVideoCtx.scale(-1, 1);
    }
    // Draw the camera to the canvas with high contrast before dithering
    bgVideoCtx.filter = `contrast(${state.contrast}) brightness(1.1)`;
    bgVideoCtx.drawImage(video, sx, sy, sw, sh, 0, 0, frameW, frameH);
    
    // Apply Bayer Ordered Dithering (1-bit)
    const imgData = bgVideoCtx.getImageData(0, 0, frameW, frameH);
    const data = imgData.data;
    const bayer = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const i = (y * frameW + x) * 4;
        const luma = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const threshold = (bayer[y % 4][x % 4] / 16) * 255;
        const c = luma > threshold ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = c;
        data[i+3] = 255;
      }
    }
    bgVideoCtx.putImageData(imgData, 0, 0);
    
    bgVideoCtx.restore();
  }

  const { data } = captureCtx.getImageData(0, 0, cols, rows);

  // Mapping: dark camera zone → dense character, bright zone → space
  // (inverted so dark areas = ink, like printing on paper)
  const T_SPACE = 80;   // luma > (255-80)=175 → space (bright area)
  const T_DOT = 148;  // mid-tone → middle dot

  if (!sequentialText) buildPool();
  seqIdx = 0; // Reset index at start of each frame so text stays perfectly stable

  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const m = state.invertAscii ? luma : 255 - luma; // invert logic
      if (m < T_SPACE) {
        line += ' ';
      } else if (m < T_DOT) {
        line += '.';
      } else {
        // Sequential sentence text
        line += sequentialText[seqIdx % sequentialText.length];
        seqIdx++;
      }
    }
    lines.push(line);
  }
  asciiText.textContent = lines.join('\n');

  state.animId = requestAnimationFrame(renderFrame);
}

let videoDevices = [];
let currentDeviceIdx = 0;

/* ── CAMERA ── */
async function startCamera() {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Stop stream lama dulu agar kamera Android tidak lock
    if (state.stream) {
      state.stream.getTracks().forEach(t => t.stop());
      state.stream = null;
      video.srcObject = null;
    }

    // Android: coba 'exact' dulu (paksa ganti kamera), jika gagal fallback ke 'ideal'
    let videoConstraint;
    if (isMobile) {
      try {
        videoConstraint = { facingMode: { exact: state.facingMode } };
        state.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
      } catch (_) {
        // exact gagal (misal hanya 1 kamera), fallback ke ideal
        videoConstraint = { facingMode: { ideal: state.facingMode } };
        state.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
      }
    } else {
      videoConstraint = { facingMode: state.facingMode };
      state.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
    }

    video.srcObject = state.stream;
    // Tunggu metadata & video benar-benar siap
    await new Promise(r => { video.onloadedmetadata = r; });
    await video.play();
    // Ekstra tunggu 1 frame agar videoWidth/videoHeight terisi (penting di Android)
    await new Promise(r => requestAnimationFrame(r));

    // Tampilkan tombol switch kamera jika ada lebih dari 1 kamera
    if (isMobile) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      if (btnSwitchCam) {
        btnSwitchCam.style.display = videoInputs.length > 1 ? 'inline-flex' : 'none';
      }
    }

    state.running = true;
    cameraOff.classList.add('hidden');
    overlayMsg.classList.add('hidden');
    liveBadge.classList.add('visible');
    btnCamera.classList.add('active');
    btnCamera.textContent = '[ STOP ]';

    buildPool();
    asciiText.style.display = 'block';

    if (state.animId) cancelAnimationFrame(state.animId);
    state.animId = requestAnimationFrame(renderFrame);
    showToast('KAMERA AKTIF');
  } catch (err) {
    console.error('Camera error:', err);
    let msg = 'TIDAK BISA AKSES KAMERA';
    if (err.name === 'NotAllowedError')  msg = 'IZIN KAMERA DITOLAK';
    if (err.name === 'NotFoundError')    msg = 'KAMERA TIDAK DITEMUKAN';
    if (err.name === 'NotReadableError') msg = 'KAMERA DIPAKAI APLIKASI LAIN';
    if (err.name === 'OverconstrainedError') msg = 'KAMERA TIDAK MENDUKUNG MODE INI';
    showToast(msg);
  }
}

function stopCamera() {
  state.running = false;
  if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
  if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
  video.srcObject = null;
  cameraOff.classList.remove('hidden');
  overlayMsg.classList.remove('hidden');
  liveBadge.classList.remove('visible');
  btnCamera.classList.remove('active');
  btnCamera.textContent = '[ START ]';
  asciiText.textContent = '';
  showToast('KAMERA MATI');
}

/* ════════════════════════════════════════════════════════
   EXPORT ENGINE — selalu re-render dari kamera dengan
   densitas karakter tetap (EXPORT_CHAR_W / EXPORT_LINE_H)
   sehingga kualitas PC == Android == iOS.
   ════════════════════════════════════════════════════════ */

// Konstanta ekspor: gunakan font kecil (setara mobile) agar
// paling banyak karakter → paling detail di semua platform.
const EXPORT_FONT_SIZE = 10;   // px di canvas output
const EXPORT_CHAR_W    = 4.0;  // VT323 advance-width pada 10px
const EXPORT_LINE_H    = 10;   // = EXPORT_FONT_SIZE (line-height 1.0)

/**
 * Re-render ulang frame kamera langsung ke canvas target
 * dengan kepadatan EXPORT_CHAR_W × EXPORT_LINE_H, terlepas
 * dari ukuran font yang sedang dipakai di layar.
 */
function renderToCanvas(target, format = 'story') {
  // Pastikan kamera aktif
  if (!state.running || !video.videoWidth || !video.videoHeight) return false;

  const frameW = asciiFrame ? asciiFrame.offsetWidth  : 340;
  const frameH = asciiFrame ? asciiFrame.offsetHeight : 453;

  // Jumlah kolom & baris berdasarkan ukuran frame LAYAR (bukan layar kecil/besar)
  // tapi dengan EXPORT_CHAR_W yang kecil → selalu densitas tinggi
  const cols = Math.floor(frameW / EXPORT_CHAR_W);
  const rows = Math.floor(frameH / EXPORT_LINE_H);

  // ── Re-sample kamera pada resolusi ekspor ──────────────
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const frameAspect = frameW / frameH;
  let sx, sy, sw, sh;
  if ((vw / vh) > frameAspect) {
    sh = vh; sw = vh * frameAspect; sx = (vw - sw) / 2; sy = 0;
  } else {
    sw = vw; sh = vw / frameAspect; sx = 0; sy = (vh - sh) / 2;
  }

  const expCanvas = document.createElement('canvas');
  expCanvas.width  = cols;
  expCanvas.height = rows;
  const expCtx = expCanvas.getContext('2d', { willReadFrequently: true });

  expCtx.save();
  if (state.mirrored) { expCtx.translate(cols, 0); expCtx.scale(-1, 1); }
  expCtx.filter = `contrast(${state.contrast}) brightness(1.05)`;
  expCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
  expCtx.restore();

  const { data } = expCtx.getImageData(0, 0, cols, rows);

  // ── ASCII mapping (sama dengan renderFrame) ────────────
  const T_SPACE = 80;
  const T_DOT   = 148;

  if (!sequentialText) buildPool();
  let localIdx = 0;

  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const i    = (r * cols + c) * 4;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const m    = state.invertAscii ? luma : 255 - luma;
      if (m < T_SPACE) {
        line += ' ';
      } else if (m < T_DOT) {
        line += '.';
      } else {
        line += sequentialText[localIdx % sequentialText.length];
        localIdx++;
      }
    }
    lines.push(line);
  }

  // ── Dimensi canvas output ──────────────────────────────
  const SCALE       = 3;   // 3× untuk ketajaman cetak
  const FONT_SIZE   = EXPORT_FONT_SIZE;
  const CHAR_W      = EXPORT_CHAR_W;
  const LINE_H      = EXPORT_LINE_H;

  const PADDING       = 20  * SCALE;
  const INNER_PAD     = 16  * SCALE;
  const FOOTER_HEIGHT = 280 * SCALE;

  const cw     = Math.round(cols * CHAR_W  * SCALE);
  const ch     = Math.round(rows * LINE_H  * SCALE);
  const cw_box = cw + INNER_PAD * 2;
  const ch_box = ch + INNER_PAD * 2;

  const contentWidth  = cw_box + PADDING * 2;
  const contentHeight = ch_box + PADDING * 2 + FOOTER_HEIGHT;

  let finalWidth  = contentWidth;
  let finalHeight = contentHeight;
  let offsetY     = 0;

  if (format === 'story') {
    finalHeight = Math.round(finalWidth * (16 / 9));
    offsetY     = Math.round((finalHeight - contentHeight) / 2);
    if (offsetY < 0) { finalHeight = contentHeight; offsetY = 0; }
  }

  target.width  = Math.max(finalWidth,  1);
  target.height = Math.max(finalHeight, 1);

  const ctx = target.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);

  ctx.save();
  ctx.translate(0, offsetY);

  // Background camera dither (jika aktif)
  if (state.showBgCam && bgVideoCanvas) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bgVideoCanvas, PADDING + INNER_PAD, PADDING + INNER_PAD, cw, ch);
    ctx.restore();
  }

  // Dotted border
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth   = 4 * SCALE;
  ctx.setLineDash([4 * SCALE, 6 * SCALE]);
  ctx.strokeRect(PADDING, PADDING, cw_box, ch_box);
  ctx.setLineDash([]);

  // ASCII Text
  if (state.showText) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `${FONT_SIZE * SCALE}px 'VT323', monospace`;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) =>
      ctx.fillText(line, PADDING + INNER_PAD, PADDING + INNER_PAD + i * LINE_H * SCALE)
    );
    ctx.globalCompositeOperation = 'source-over';
  }

  // Receipt Footer
  const footerY = PADDING + ch_box + 40 * SCALE;
  ctx.fillStyle = '#1A1A1A';

  ctx.font = `bold ${32 * SCALE}px 'Space Grotesk', sans-serif`;
  ctx.fillText('ASCII-ROID', PADDING, footerY);

  ctx.font = `500 ${24 * SCALE}px 'Space Grotesk', sans-serif`;
  const words = [
    'BUKAN STRUK MINIMARKET',
    '100% LO-RES DEFINITION',
    'WARNING: WILL FADE EVENTUALLY'
  ];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const today      = new Date();
  const dateString = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(randomWord, PADDING, footerY + 45 * SCALE, cw_box);

  ctx.font = `500 ${20 * SCALE}px 'Space Grotesk', sans-serif`;
  ctx.fillText(dateString, PADDING, footerY + 75 * SCALE, cw_box);

  ctx.beginPath();
  ctx.setLineDash([4 * SCALE, 4 * SCALE]);
  ctx.lineWidth = 2 * SCALE;
  ctx.moveTo(PADDING,          footerY + 115 * SCALE);
  ctx.lineTo(PADDING + cw_box, footerY + 115 * SCALE);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `500 ${24 * SCALE}px 'Space Grotesk', sans-serif`;
  const authorText  = 'by @djoardi';
  const authorWidth = ctx.measureText(authorText).width;
  ctx.fillText(authorText, PADDING + cw_box - authorWidth, footerY + 160 * SCALE);

  ctx.fillText('IG/WA', PADDING, footerY + 200 * SCALE);
  const phoneText  = '+62 812 4678 2525';
  const phoneWidth = ctx.measureText(phoneText).width;
  ctx.fillText(phoneText, PADDING + cw_box - phoneWidth, footerY + 200 * SCALE);

  ctx.restore();
  return true;
}

// Alias untuk kompatibilitas: semua pemanggil lama tetap berfungsi
function textToCanvas(target, format = 'story') {
  return renderToCanvas(target, format);
}

let currentShareFile = null;

function takeSnapshot() {
  // Guard: cek kamera running (bukan teks, karena render langsung dari kamera)
  if (!state.running) { showToast('KAMERA BELUM AKTIF'); return; }
  if (!video.videoWidth || !video.videoHeight) { showToast('VIDEO BELUM SIAP'); return; }

  // Jalankan langsung (synchronous dari user gesture — penting untuk Android)
  const ok = renderToCanvas(lightboxCanvas);
  if (!ok) { showToast('GAGAL MENGAMBIL SNAPSHOT'); return; }

  lightbox.removeAttribute('hidden');
  showToast('SNAPSHOT DIAMBIL');

  // Siapkan file share secara async
  currentShareFile = null;
  lightboxCanvas.toBlob(blob => {
    if (blob) {
      currentShareFile = new File([blob], `ascii_roid_${Date.now()}.png`, { type: 'image/png' });
    }
  }, 'image/png');
}

// Download: gunakan toDataURL (sync) agar bisa dipanggil dari user gesture di Android/iOS
function downloadCanvas(canvas) {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = `ascii_roid_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('MENGUNDUH...');
  } catch (e) {
    // Fallback: buka di tab baru (Android WebView / iOS Safari)
    try {
      const dataUrl = canvas.toDataURL('image/png');
      window.open(dataUrl, '_blank');
      showToast('BUKA TAB BARU UNTUK SIMPAN');
    } catch (_) {
      showToast('GAGAL MENGUNDUH');
    }
  }
}

function downloadCurrent() {
  if (!state.running) { showToast('KAMERA BELUM AKTIF'); return; }
  if (!video.videoWidth || !video.videoHeight) { showToast('VIDEO BELUM SIAP'); return; }
  // Render langsung dari kamera saat user gesture (penting Android)
  const tmp = document.createElement('canvas');
  if (renderToCanvas(tmp)) {
    downloadCanvas(tmp);
  } else {
    showToast('TIDAK ADA DATA');
  }
}

function canvasToEscPos(canvas, printWidth = 384) {
  const ratio = printWidth / canvas.width;
  const printHeight = Math.round(canvas.height * ratio);
  
  const tmp = document.createElement('canvas');
  tmp.width = printWidth;
  tmp.height = printHeight;
  const ctx = tmp.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, printWidth, printHeight);
  ctx.imageSmoothingEnabled = false; // Nearest neighbor scaling to prevent anti-aliasing (no grays)
  ctx.drawImage(canvas, 0, 0, printWidth, printHeight);
  
  const imgData = ctx.getImageData(0, 0, printWidth, printHeight);
  const pixels = imgData.data;
  
  const lumaArray = new Float32Array(printWidth * printHeight);
  for (let i = 0; i < printWidth * printHeight; i++) {
     const idx = i * 4;
     const a = pixels[idx + 3] / 255;
     const r = pixels[idx] * a + 255 * (1 - a);
     const g = pixels[idx + 1] * a + 255 * (1 - a);
     const b = pixels[idx + 2] * a + 255 * (1 - a);
     lumaArray[i] = (r * 0.299 + g * 0.587 + b * 0.114);
  }
  
  const widthInBytes = Math.ceil(printWidth / 8);
  const BAND_HEIGHT = 64; // Small chunks (3KB max) to prevent printer buffer overflow
  const numBands = Math.ceil(printHeight / BAND_HEIGHT);
  
  const buffers = [];
  
  // INIT PRINTER (Reset)
  buffers.push(new Uint8Array([0x1B, 0x40]));
  
  for (let b = 0; b < numBands; b++) {
    const bandStartY = b * BAND_HEIGHT;
    const bandHeight = Math.min(BAND_HEIGHT, printHeight - bandStartY);
    const dataLen = widthInBytes * bandHeight;
    
    const buffer = new Uint8Array(8 + dataLen);
    buffer.set([0x1D, 0x76, 0x30, 0x00], 0); // GS v 0
    buffer[4] = widthInBytes & 0xFF;
    buffer[5] = (widthInBytes >> 8) & 0xFF;
    buffer[6] = bandHeight & 0xFF;
    buffer[7] = (bandHeight >> 8) & 0xFF;
    
    let offset = 8;
    for (let y = 0; y < bandHeight; y++) {
      const globalY = bandStartY + y;
      for (let xByte = 0; xByte < widthInBytes; xByte++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < printWidth) {
             if (lumaArray[globalY * printWidth + x] < 128) {
               byte |= (1 << (7 - bit));
             }
          }
        }
        buffer[offset++] = byte;
      }
    }
    buffers.push(buffer);
  }
  
  // Cut or feed paper
  buffers.push(new Uint8Array([0x1B, 0x64, 0x03]));
  return buffers;
}

const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  0x18F0, 0xFF00, 0xFFE0
];

async function printViaBluetooth(canvas) {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES
    });
    
    showToast('MENGHUBUNGKAN PRINTER...');
    const server = await device.gatt.connect();
    
    let writeChar = null;
    const services = await server.getPrimaryServices();
    
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }
    
    if (!writeChar) {
      showToast('TIDAK DITEMUKAN LAYANAN PRINT');
      device.gatt.disconnect();
      return;
    }
    
    showToast('MEMPROSES GAMBAR...');
    const bands = canvasToEscPos(canvas, 384);
    
    showToast('MENCETAK...');
    const CHUNK_SIZE = 100;
    
    for (let b = 0; b < bands.length; b++) {
      const buffer = bands[b];
      for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        const chunk = buffer.slice(i, i + CHUNK_SIZE);
        if (writeChar.properties.write) {
           await writeChar.writeValue(chunk);
           await new Promise(r => setTimeout(r, 5)); 
        } else {
           await writeChar.writeValueWithoutResponse(chunk);
           await new Promise(r => setTimeout(r, 20)); 
        }
      }
      // Give printer time to empty its buffer and physically print the band
      await new Promise(r => setTimeout(r, 150)); 
    }
    
    showToast('CETAK SELESAI');
    device.gatt.disconnect();
    
  } catch (err) {
    console.error(err);
    if (err.name !== 'NotFoundError') {
      showToast('GAGAL KONEK BLUETOOTH');
    }
  }
}

async function printReceipt() {
  if (!state.running) { showToast('KAMERA BELUM AKTIF'); return; }
  if (!video.videoWidth || !video.videoHeight) { showToast('VIDEO BELUM SIAP'); return; }

  // Render canvas dari kamera (harus di sini, dari user gesture)
  const tmp = document.createElement('canvas');
  if (!renderToCanvas(tmp)) { showToast('TIDAK ADA DATA'); return; }

  // Cek Bluetooth tersedia DAN halaman pakai HTTPS (Android wajib HTTPS untuk BT)
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  if (navigator.bluetooth && isHttps) {
    await printViaBluetooth(tmp);
  } else {
    // Fallback: tampilkan di lightbox lalu window.print()
    // Copy canvas ke lightboxCanvas untuk ditampilkan
    lightboxCanvas.width  = tmp.width;
    lightboxCanvas.height = tmp.height;
    lightboxCanvas.getContext('2d').drawImage(tmp, 0, 0);
    lightbox.removeAttribute('hidden');
    showToast('MEMPERSIAPKAN PRINT...');
    setTimeout(() => window.print(), 600);
  }
}

/* ── TOAST ── */
let toastTimer;
function showToast(msg, dur = 2400) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), dur);
}

/* ── EVENTS ── */
btnCamera.addEventListener('click', () => state.running ? stopCamera() : startCamera());

if (btnSwitchCam) {
  btnSwitchCam.addEventListener('click', () => {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    showToast(state.facingMode === 'user' ? 'KAMERA DEPAN' : 'KAMERA BELAKANG');
    if (state.running) {
      // Hentikan render & stream sebelum ganti kamera
      state.running = false;
      if (state.animId) { cancelAnimationFrame(state.animId); state.animId = null; }
      if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
      video.srcObject = null;
      // Beri jeda 800ms agar OS Android benar-benar melepas hardware kamera
      setTimeout(startCamera, 800);
    }
  });
}

btnFlip.addEventListener('click', () => {
  state.mirrored = !state.mirrored;
  showToast(state.mirrored ? 'MIRROR ON' : 'MIRROR OFF');
});

btnBgCam.addEventListener('click', () => {
  state.showBgCam = !state.showBgCam;
  if (bgVideoCanvas) bgVideoCanvas.classList.toggle('show', state.showBgCam);
  btnBgCam.classList.toggle('active', state.showBgCam);
  showToast(state.showBgCam ? 'BACKGROUND: ON' : 'BACKGROUND: OFF');
});

if (btnToggleText) {
  btnToggleText.addEventListener('click', () => {
    state.showText = !state.showText;
    asciiText.style.opacity = state.showText ? '1' : '0';
    btnToggleText.classList.toggle('active', !state.showText);
    showToast(state.showText ? 'TEXT: ON' : 'TEXT: OFF');
  });
}

btnInvert.addEventListener('click', () => {
  state.invertAscii = !state.invertAscii;
  btnInvert.classList.toggle('active', state.invertAscii);
  showToast(state.invertAscii ? 'INVERT: ON' : 'INVERT: OFF');
});

selLang.addEventListener('change', () => {
  state.lang = selLang.value;
  buildPool();
});

btnSnapshot.addEventListener('click', takeSnapshot);
btnDownload.addEventListener('click', downloadCurrent);
btnPrint.addEventListener('click', printReceipt);

lightboxClose.addEventListener('click', () => lightbox.setAttribute('hidden', ''));
lightboxBg.addEventListener('click', () => lightbox.setAttribute('hidden', ''));
lightboxCanvas.addEventListener('dblclick', () => downloadCanvas(lightboxCanvas));

if (btnShare) {
  btnShare.addEventListener('click', async () => {
    if (!navigator.share || !navigator.canShare) {
      showToast('TIDAK DIDUKUNG BROWSER INI');
      return;
    }
    if (!currentShareFile) {
      showToast('GAMBAR SEDANG DIPROSES, COBA LAGI');
      return;
    }
    if (!navigator.canShare({ files: [currentShareFile] })) {
       showToast('BROWSER TIDAK MENDUKUNG SHARE GAMBAR');
       return;
    }
    try {
      await navigator.share({
        title: 'ASCII-ROID',
        text: '📸 diambil dengan ASCII-ROID',
        files: [currentShareFile]
      });
    } catch (err) {
      if (err.name !== 'AbortError') showToast('GAGAL MEMBAGIKAN');
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') lightbox.setAttribute('hidden', '');
  if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey) takeSnapshot();
});

if (btnFullscreen) {
  btnFullscreen.addEventListener('click', () => {
    const docElm = document.documentElement;
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullscreen) {
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch(() => showToast('Gagal Fullscreen'));
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
      } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
      } else {
        showToast('iOS/Browser tidak dukung Fullscreen');
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  });
}

/* ── INIT ── */
buildPool();

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile && btnSwitchCam) {
  btnSwitchCam.style.display = 'flex';
}
