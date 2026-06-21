const fs = require('fs').promises;
const path = require('path');

const buildWatermarkSvg = (text, width, height) => {
  const safeText = String(text).replace(/[<>&"]/g, '');
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .wm { fill: rgba(120, 20, 20, 0.18); font: 700 28px 'IBM Plex Sans', sans-serif; }
      </style>
      <text x="50%" y="50%" text-anchor="middle" transform="rotate(-30 ${width / 2} ${height / 2})" class="wm">${safeText}</text>
    </svg>
  `);
};

const watermarkImage = async (filePath, watermarkText) => {
  const sharp = require('sharp');
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 800;
  const watermark = buildWatermarkSvg(watermarkText, width, height);

  return image
    .composite([{ input: watermark, gravity: 'center' }])
    .toBuffer();
};

const buildHtmlPreview = ({ title, watermarkText, embedUrl, mimeType }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Preview</title>
  <style>
    body { margin: 0; font-family: 'IBM Plex Sans', sans-serif; background: #f4f4f5; }
    .banner { background: #7f1d1d; color: #fff; padding: 0.75rem 1rem; font-size: 0.875rem; }
    .frame-wrap { position: relative; min-height: 80vh; }
    .frame-wrap::after {
      content: '${watermarkText.replace(/'/g, "\\'")}';
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: clamp(1.5rem, 4vw, 2.5rem); font-weight: 700; color: rgba(127, 29, 29, 0.15);
      transform: rotate(-24deg); pointer-events: none; user-select: none;
    }
    iframe, embed, object { width: 100%; height: 80vh; border: 0; background: #fff; }
  </style>
</head>
<body>
  <div class="banner">Confidential preview — ${watermarkText}</div>
  <div class="frame-wrap">
    ${mimeType === 'application/pdf'
      ? `<embed src="${embedUrl}" type="application/pdf" />`
      : `<iframe src="${embedUrl}" title="${title}"></iframe>`}
  </div>
</body>
</html>`;

const isImageMime = (mimeType) => /^image\//.test(mimeType || '');

module.exports = {
  buildHtmlPreview,
  watermarkImage,
  isImageMime
};
