# 📱 QR File Share

> Upload any file (video, PDF, image, audio, documents) and instantly generate a QR code to view and download it from any device anywhere in the world!

[![Deployed with Vercel](https://img.shields.io/badge/Deployed%20with-Vercel-black?logo=vercel)](https://qr-file-share-sigma.vercel.app)
[![Vercel Blob](https://img.shields.io/badge/Storage-Vercel%20Blob-0070F3?logo=vercel)](https://vercel.com/docs/storage/vercel-blob)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Live Demo
🌐 **[https://qr-file-share-sigma.vercel.app](https://qr-file-share-sigma.vercel.app)**

---

## ✨ Features
- 📤 **Drag & Drop Upload:** Seamlessly drop any file to upload.
- 📱 **Instant QR Code:** High-resolution QR code generated on the fly.
- ☁️ **Vercel Blob Cloud Storage:** Powered by Vercel Blob with client-side direct uploads (supports large files up to 500MB without lambda payload limits).
- 🌍 **Universal Access:** Scan via mobile camera on LTE/5G/WiFi from anywhere in the world.
- 🎬 **Rich In-Browser Previews:**
  - **Videos:** Interactive HTML5 video player with fullscreen support.
  - **PDFs:** Direct document viewer & 1-click download.
  - **Images:** High-res responsive image preview.
  - **Audio:** Embedded audio player.
  - **Archives & Others:** File details & instant download.
- 📋 **Recent Uploads History:** Saved locally in browser for quick re-access.

---

## 🛠️ Tech Stack
- **Frontend:** Vanilla HTML5, CSS3 (Modern Glassmorphism & Animated Gradients), JavaScript (ES Modules)
- **Backend / Serverless:** Vercel Serverless Functions (`/api/upload`)
- **Cloud Storage:** `@vercel/blob`
- **QR Code:** `qrcode`

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/PrattayDev/qr-file-share.git

# Navigate to project folder
cd qr-file-share

# Install dependencies
npm install

# Run locally
npm start
```

---

## 📄 License
MIT © [PrattayDev](https://github.com/PrattayDev)
