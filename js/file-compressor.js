'use strict';
/* ═══════════════════════════════════════════════════════════════════
   File Compressor — fully client-side (no backend, no uploads).
   - Images (JPG/JPEG/PNG/WEBP): iteratively re-encode via <canvas>,
     adjusting quality and (if needed) downscaling, to approach a
     target size in KB while keeping the image usable.
   - PDF: uses pdf-lib to re-save the document with object streams,
     which shrinks structural overhead. Real recompression of a PDF's
     embedded content in pure client JS is limited, so we are upfront
     when the requested target can't realistically be reached.
   ═══════════════════════════════════════════════════════════════════ */

const fcDropZone   = document.getElementById('fcDropZone');
const fcFileInput  = document.getElementById('fcFileInput');
const fcBrowseBtn  = document.getElementById('fcBrowseBtn');
const fcFileInfo   = document.getElementById('fcFileInfo');
const fcFileName   = document.getElementById('fcFileName');
const fcFileType   = document.getElementById('fcFileType');
const fcOriginalSizeEl = document.getElementById('fcOriginalSize');
const fcRemoveBtn  = document.getElementById('fcRemoveBtn');
const fcPreviewImg = document.getElementById('fcPreviewImg');
const fcTargetSize = document.getElementById('fcTargetSize');
const fcCompressBtn = document.getElementById('fcCompressBtn');
const fcStatus      = document.getElementById('fcStatus');
const fcResult       = document.getElementById('fcResult');
const fcStatOriginal   = document.getElementById('fcStatOriginal');
const fcStatCompressed = document.getElementById('fcStatCompressed');
const fcStatPercent    = document.getElementById('fcStatPercent');
const fcResultPreview  = document.getElementById('fcResultPreview');
const fcDownloadBtn    = document.getElementById('fcDownloadBtn');

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPE = 'application/pdf';

let currentFile = null;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message, type) {
  if (!message) { fcStatus.hidden = true; fcStatus.textContent = ''; return; }
  fcStatus.hidden = false;
  fcStatus.className = `fc-status ${type || 'info'}`;
  fcStatus.textContent = message;
}

function resetResult() {
  fcResult.hidden = true;
  fcResultPreview.hidden = true;
  if (fcDownloadBtn.href && fcDownloadBtn.href.startsWith('blob:')) URL.revokeObjectURL(fcDownloadBtn.href);
  fcDownloadBtn.removeAttribute('href');
}

function isAcceptedFile(file) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === ACCEPTED_PDF_TYPE;
}

function selectFile(file) {
  if (!file) return;
  if (!isAcceptedFile(file)) {
    setStatus('Unsupported file type. Please choose a JPG, JPEG, PNG, WEBP or PDF file.', 'error');
    return;
  }
  currentFile = file;
  resetResult();
  setStatus('');

  fcFileName.textContent = file.name;
  fcFileType.textContent = file.type === ACCEPTED_PDF_TYPE ? 'PDF Document' : file.type.replace('image/', '').toUpperCase();
  fcOriginalSizeEl.textContent = formatSize(file.size);
  fcFileInfo.hidden = false;
  fcTargetSize.value = '';

  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    const url = URL.createObjectURL(file);
    fcPreviewImg.src = url;
    fcPreviewImg.hidden = false;
    fcPreviewImg.onload = () => URL.revokeObjectURL(url);
  } else {
    fcPreviewImg.hidden = true;
    fcPreviewImg.removeAttribute('src');
  }
}

function removeFile() {
  currentFile = null;
  fcFileInput.value = '';
  fcFileInfo.hidden = true;
  fcPreviewImg.hidden = true;
  fcPreviewImg.removeAttribute('src');
  resetResult();
  setStatus('');
}

/* ── Drag & drop + browse wiring ─────────────────────────────────── */
fcBrowseBtn.addEventListener('click', e => { e.stopPropagation(); fcFileInput.click(); });
fcDropZone.addEventListener('click', () => fcFileInput.click());
fcDropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fcFileInput.click(); } });
fcFileInput.addEventListener('change', () => selectFile(fcFileInput.files[0]));

['dragenter', 'dragover'].forEach(evt =>
  fcDropZone.addEventListener(evt, e => { e.preventDefault(); fcDropZone.classList.add('fc-dragover'); })
);
['dragleave', 'dragend', 'drop'].forEach(evt =>
  fcDropZone.addEventListener(evt, e => { e.preventDefault(); fcDropZone.classList.remove('fc-dragover'); })
);
fcDropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) selectFile(file);
});

fcRemoveBtn.addEventListener('click', removeFile);

/* ── Image compression: iterative quality/scale search ───────────── */
async function loadImageBitmap(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not read this image file.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
}

async function compressImage(file, targetBytes) {
  const img = await loadImageBitmap(file);
  const outType = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
  // PNG is lossless in the browser canvas encoder (no quality knob), so if
  // the target is smaller than a reasonable PNG re-encode, fall back to
  // JPEG which supports a real quality/size tradeoff.
  const canEncodeWithQuality = outType !== 'image/png';

  let scale = 1;
  let best = null;

  for (let attempt = 0; attempt < 18; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (canEncodeWithQuality) {
      let lo = 0.05, hi = 0.95, chosen = null;
      for (let i = 0; i < 7; i++) {
        const q = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, outType, q);
        if (!blob) break;
        if (blob.size > targetBytes) { hi = q; } else { chosen = blob; lo = q; }
      }
      if (!chosen) chosen = await canvasToBlob(canvas, outType, lo);
      if (chosen && (!best || chosen.size < best.size)) best = chosen;
      if (chosen && chosen.size <= targetBytes) return { blob: chosen, mimeType: outType };
    } else {
      const blob = await canvasToBlob(canvas, outType, 1);
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) return { blob, mimeType: outType };
      // PNG too large even losslessly at this scale: fall through to
      // downscale, and after a couple of tries switch to JPEG.
      if (attempt >= 2) return compressImage(new File([file], file.name, { type: 'image/jpeg' }), targetBytes);
    }

    scale *= 0.82; // shrink dimensions and try again
    if (canvas.width <= 40 || canvas.height <= 40) break;
  }

  return { blob: best, mimeType: outType, unreachable: true };
}

/* ── PDF compression: structural optimization via pdf-lib ───────── */
async function compressPdf(file, targetBytes) {
  if (!window.PDFLib) throw new Error('PDF engine failed to load. Check your connection and try again.');
  const bytes = await file.arrayBuffer();
  const pdfDoc = await window.PDFLib.PDFDocument.load(bytes, { updateMetadata: false });

  // Strip metadata (title/author/etc.) — reduces overhead, harmless to keep the PDF usable.
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  const outBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  return { blob, mimeType: 'application/pdf', unreachable: blob.size > targetBytes };
}

/* ── Compress button ─────────────────────────────────────────────── */
fcCompressBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  const targetKb = Number(fcTargetSize.value);
  if (!targetKb || targetKb <= 0) {
    setStatus('Please enter a target size in KB greater than 0.', 'error');
    return;
  }
  const targetBytes = Math.round(targetKb * 1024);

  if (targetBytes >= currentFile.size) {
    setStatus('Target size is larger than (or equal to) the original file — nothing to compress.', 'error');
    return;
  }

  resetResult();
  setStatus('Compressing… this happens entirely in your browser.', 'info');
  fcCompressBtn.disabled = true;

  try {
    let outcome;
    if (currentFile.type === ACCEPTED_PDF_TYPE) {
      outcome = await compressPdf(currentFile, targetBytes);
    } else {
      outcome = await compressImage(currentFile, targetBytes);
    }

    if (!outcome || !outcome.blob) {
      setStatus("Compression failed — this file couldn't be processed.", 'error');
      return;
    }

    const { blob, unreachable } = outcome;
    const percent = Math.max(0, Math.round((1 - blob.size / currentFile.size) * 100));

    fcStatOriginal.textContent = formatSize(currentFile.size);
    fcStatCompressed.textContent = formatSize(blob.size);
    fcStatPercent.textContent = `${percent}%`;

    const url = URL.createObjectURL(blob);
    fcDownloadBtn.href = url;
    const base = currentFile.name.replace(/\.[^.]+$/, '');
    const ext = outcome.mimeType === 'image/png' ? 'png' : outcome.mimeType === 'image/webp' ? 'webp' : outcome.mimeType === 'application/pdf' ? 'pdf' : 'jpg';
    fcDownloadBtn.download = `${base}-compressed.${ext}`;

    if (ACCEPTED_IMAGE_TYPES.includes(outcome.mimeType)) {
      fcResultPreview.src = url;
      fcResultPreview.hidden = false;
    } else {
      fcResultPreview.hidden = true;
    }

    fcResult.hidden = false;

    if (blob.size > targetBytes) {
      setStatus(
        currentFile.type === ACCEPTED_PDF_TYPE
          ? 'Could not reach the exact target size — PDF structural optimization has limits in the browser, especially for text-only or already-compact PDFs. This is the smallest usable result achieved.'
          : "Could not reach the exact target size without making the image unusable. This is the smallest result that stays reasonably clear — try a slightly larger target.",
        'error'
      );
    } else {
      setStatus('Done! Your file has been compressed.', 'success');
    }
  } catch (err) {
    setStatus(err.message || 'Something went wrong while compressing this file.', 'error');
  } finally {
    fcCompressBtn.disabled = false;
  }
});
