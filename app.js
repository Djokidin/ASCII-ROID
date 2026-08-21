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

/* ── CHAR METRICS (must match style.css ascii-out font) ── */
const FONT_SIZE = 24;          // px — matches .ascii-out font-size
const CHAR_W = 9.609;       // VT323 advance width at 24px
const LINE_H = 24;          // 24 × 1 line-height

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
    let constraints = { video: true };
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      if (videoDevices.length > 0) {
        constraints.video = { deviceId: { exact: videoDevices[currentDeviceIdx].deviceId } };
      } else {
        constraints.video = { facingMode: state.facingMode };
      }
    } else {
      constraints.video = { facingMode: state.facingMode };
    }

    state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = state.stream;
    await new Promise(r => (video.onloadedmetadata = r));
    await video.play();

    if (isMobile && videoDevices.length === 0) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      videoDevices = devices.filter(d => d.kind === 'videoinput');
      if (state.stream.getVideoTracks().length > 0) {
        const activeTrack = state.stream.getVideoTracks()[0];
        const activeDevice = videoDevices.find(d => d.label === activeTrack.label);
        if (activeDevice) {
           currentDeviceIdx = videoDevices.indexOf(activeDevice);
        }
      }
      if (videoDevices.length > 1 && btnSwitchCam) {
         btnSwitchCam.style.display = 'inline-flex';
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
    let msg = 'TIDAK BISA AKSES KAMERA';
    if (err.name === 'NotAllowedError') msg = 'IZIN KAMERA DITOLAK';
    if (err.name === 'NotFoundError') msg = 'KAMERA TIDAK DITEMUKAN';
    if (err.name === 'NotReadableError') msg = 'KAMERA DIPAKAI APLIKASI LAIN';
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

/* ── SNAPSHOT / DOWNLOAD ── */
function textToCanvas(target, format = 'story') {
  const text = asciiText.textContent;
  if (!text) return false;
  const lines = text.split('\n');
  if (!lines.length) return false;


  const cols = lines[0].length;
  const rows = lines.length;
  
  const SCALE = 3; // 3x scale for very crisp printing
  const cw = Math.round(cols * CHAR_W * SCALE);
  const ch = Math.round(rows * LINE_H * SCALE);
  
  const PADDING = 20 * SCALE;
  const INNER_PAD = 16 * SCALE;
  const FOOTER_HEIGHT = 280 * SCALE;
  
  const cw_box = cw + INNER_PAD * 2;
  const ch_box = ch + INNER_PAD * 2;
  
  const contentWidth = cw_box + PADDING * 2;
  const contentHeight = ch_box + PADDING * 2 + FOOTER_HEIGHT;

  let finalWidth = contentWidth;
  let finalHeight = contentHeight;
  let offsetY = 0;

  if (format === 'story') {
    finalHeight = Math.round(finalWidth * (16 / 9));
    offsetY = Math.round((finalHeight - contentHeight) / 2);
    if (offsetY < 0) {
      finalHeight = contentHeight;
      offsetY = 0;
    }
  }

  target.width = Math.max(finalWidth, 1);
  target.height = Math.max(finalHeight, 1);
  
  const ctx = target.getContext('2d');
  
  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  
  ctx.save();
  ctx.translate(0, offsetY);
  
  if (state.showBgCam && bgVideoCanvas) {
    ctx.save();
    ctx.globalAlpha = 1; // Full opacity for thermal printing
    ctx.imageSmoothingEnabled = false; // Ensure dither dots stay crisp when upscaled
    ctx.drawImage(bgVideoCanvas, PADDING + INNER_PAD, PADDING + INNER_PAD, cw, ch);
    ctx.restore();
  }
  
  // Dotted border
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 4 * SCALE;
  ctx.setLineDash([4 * SCALE, 6 * SCALE]);
  ctx.strokeRect(PADDING, PADDING, cw_box, ch_box);
  ctx.setLineDash([]);
  
  // ASCII Text
  if (state.showText) {
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff'; // White text blends with background
    ctx.font = `${FONT_SIZE * SCALE}px 'VT323', monospace`;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, PADDING + INNER_PAD, PADDING + INNER_PAD + i * LINE_H * SCALE));
    ctx.globalCompositeOperation = 'source-over'; // restore
  }
  
  // Receipt Footer
  const footerY = PADDING + ch_box + 40 * SCALE;
  ctx.fillStyle = '#1A1A1A';
  
  ctx.font = `bold ${32 * SCALE}px 'Space Grotesk', sans-serif`;
  ctx.fillText("ASCII-ROID", PADDING, footerY);
  
  ctx.font = `500 ${24 * SCALE}px 'Space Grotesk', sans-serif`;
  const words = [
    "BUKAN STRUK MINIMARKET",
    "100% LO-RES DEFINITION",
    "WARNING: WILL FADE EVENTUALLY"
  ];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const today = new Date();
  const dateString = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(randomWord, PADDING, footerY + 45 * SCALE, cw_box);
  
  ctx.font = `500 ${20 * SCALE}px 'Space Grotesk', sans-serif`;
  ctx.fillText(dateString, PADDING, footerY + 75 * SCALE, cw_box);
  
  ctx.beginPath();
  ctx.setLineDash([4 * SCALE, 4 * SCALE]);
  ctx.lineWidth = 2 * SCALE;
  ctx.moveTo(PADDING, footerY + 115 * SCALE);
  ctx.lineTo(PADDING + cw_box, footerY + 115 * SCALE);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.font = `500 ${24 * SCALE}px 'Space Grotesk', sans-serif`;
  const authorText = "by @djoardi";
  const authorWidth = ctx.measureText(authorText).width;
  ctx.fillText(authorText, PADDING + cw_box - authorWidth, footerY + 160 * SCALE);
  
  ctx.fillText("IG/WA", PADDING, footerY + 200 * SCALE);
  const phoneText = "+62 812 4678 2525";
  const phoneWidth = ctx.measureText(phoneText).width;
  ctx.fillText(phoneText, PADDING + cw_box - phoneWidth, footerY + 200 * SCALE);
  
  ctx.restore();
  
  return true;
}

let currentShareFile = null;

function takeSnapshot() {
  if (!state.running || !asciiText.textContent) { showToast('TIDAK ADA FRAME'); return; }
  if (textToCanvas(lightboxCanvas)) {
    lightbox.removeAttribute('hidden');
    showToast('SNAPSHOT DIAMBIL');
    
    // Siapkan file secara asinkron agar siap saat tombol share ditekan (iOS butuh ini)
    lightboxCanvas.toBlob(blob => {
      if (blob) {
        currentShareFile = new File([blob], `ascii_roid_${Date.now()}.png`, { type: 'image/png' });
      }
    }, 'image/png');
  }
}

function downloadCanvas(canvas) {
  const a = document.createElement('a');
  a.download = `ditheroid_${Date.now()}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  showToast('MENGUNDUH...');
}

function downloadCurrent() {
  if (!state.running || !asciiText.textContent) { showToast('TIDAK ADA DATA'); return; }
  const tmp = document.createElement('canvas');
  if (textToCanvas(tmp)) {
    downloadCanvas(tmp);
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
  const dataLen = widthInBytes * printHeight;
  
  const buffer = new Uint8Array(8 + dataLen + 3);
  buffer.set([0x1D, 0x76, 0x30, 0x00], 0);
  buffer[4] = widthInBytes & 0xFF;
  buffer[5] = (widthInBytes >> 8) & 0xFF;
  buffer[6] = printHeight & 0xFF;
  buffer[7] = (printHeight >> 8) & 0xFF;
  
  let offset = 8;
  for (let y = 0; y < printHeight; y++) {
    for (let xByte = 0; xByte < widthInBytes; xByte++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x < printWidth) {
           if (lumaArray[y * printWidth + x] < 128) {
             byte |= (1 << (7 - bit));
           }
        }
      }
      buffer[offset++] = byte;
    }
  }
  
  buffer.set([0x1B, 0x64, 0x03], offset);
  return buffer;
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
    const buffer = canvasToEscPos(canvas, 384);
    
    showToast('MENCETAK...');
    const CHUNK_SIZE = 256;
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      if (writeChar.properties.write) {
         await writeChar.writeValue(chunk);
      } else {
         await writeChar.writeValueWithoutResponse(chunk);
         await new Promise(r => setTimeout(r, 10)); 
      }
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
  if (!state.running || !asciiText.textContent) { showToast('TIDAK ADA DATA'); return; }
  
  if (navigator.bluetooth) {
    const tmp = document.createElement('canvas');
    if (textToCanvas(tmp, 'receipt')) {
      await printViaBluetooth(tmp);
    }
  } else {
    if (textToCanvas(lightboxCanvas, 'receipt')) {
      lightbox.removeAttribute('hidden');
      showToast('MEMPERSIAPKAN PRINT...');
      setTimeout(() => {
        window.print();
      }, 500);
    }
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
    if (videoDevices.length > 1) {
      currentDeviceIdx = (currentDeviceIdx + 1) % videoDevices.length;
      showToast('MENUKAR KAMERA...');
    } else {
      state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
      showToast(state.facingMode === 'user' ? 'KAMERA DEPAN' : 'KAMERA BELAKANG');
    }
    
    if (state.running) {
      stopCamera();
      setTimeout(startCamera, 600); // Waktu yang cukup untuk Android melepaskan hardware kamera
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
