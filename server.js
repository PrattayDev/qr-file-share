const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 50);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Get local IP address for LAN access (prefer WiFi/real adapters over VirtualBox etc.)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip VirtualBox, VMware, Docker, Hyper-V virtual adapters
        const lowerName = name.toLowerCase();
        const isVirtual = lowerName.includes('virtualbox') ||
                          lowerName.includes('vmware') ||
                          lowerName.includes('docker') ||
                          lowerName.includes('vethernet') ||
                          lowerName.includes('bluetooth') ||
                          lowerName.includes('local area connection');

        candidates.push({
          name,
          address: iface.address,
          priority: isVirtual ? 0 : (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless') ? 3 : 2)
        });
      }
    }
  }

  // Sort by priority (highest first) and return the best match
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.length > 0 ? candidates[0].address : 'localhost';
}

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use PUBLIC_URL env var, or fall back to local IP
    const baseUrl = process.env.PUBLIC_URL || `http://${getLocalIP()}:${PORT}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const viewUrl = `${baseUrl}/view/${req.file.filename}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(viewUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
        viewUrl: viewUrl
      },
      qrCode: qrCodeDataUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// View/download page for shared files
app.get('/view/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).send('File not found');
  }

  const stats = fs.statSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const originalName = filename.replace(/-\d+-\d+(\.\w+)$/, '$1');

  // Determine file type for preview
  let fileType = 'other';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) fileType = 'image';
  else if (['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext)) fileType = 'video';
  else if (['.mp3', '.wav', '.ogg', '.aac', '.flac'].includes(ext)) fileType = 'audio';
  else if (['.pdf'].includes(ext)) fileType = 'pdf';
  else if (['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js'].includes(ext)) fileType = 'text';

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  let previewHtml = '';
  const fileUrl = `/uploads/${filename}`;

  switch (fileType) {
    case 'image':
      previewHtml = `<img src="${fileUrl}" alt="${originalName}" style="max-width:100%;max-height:70vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.1);">`;
      break;
    case 'video':
      previewHtml = `<video controls style="max-width:100%;max-height:70vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.1);"><source src="${fileUrl}">Your browser does not support video playback.</video>`;
      break;
    case 'audio':
      previewHtml = `<div style="padding:40px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;text-align:center;"><div style="font-size:64px;margin-bottom:20px;">🎵</div><audio controls style="width:100%;"><source src="${fileUrl}">Your browser does not support audio.</audio></div>`;
      break;
    case 'pdf':
      previewHtml = `<iframe src="${fileUrl}" style="width:100%;height:70vh;border:none;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.1);"></iframe>`;
      break;
    default:
      previewHtml = `<div style="padding:60px;text-align:center;background:linear-gradient(135deg,#f093fb,#f5576c);border-radius:16px;color:white;"><div style="font-size:72px;margin-bottom:16px;">📄</div><p style="font-size:18px;opacity:0.9;">Preview not available for this file type</p></div>`;
  }

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${originalName} - QR File Share</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); min-height:100vh; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; }
    .card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:32px; max-width:700px; width:100%; }
    .file-info { display:flex; align-items:center; gap:16px; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .file-icon { font-size:40px; }
    .file-details h2 { font-size:18px; font-weight:600; word-break:break-all; }
    .file-details p { font-size:14px; color:rgba(255,255,255,0.6); margin-top:4px; }
    .preview { margin-bottom:24px; text-align:center; }
    .download-btn { display:block; text-align:center; padding:16px 32px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; text-decoration:none; border-radius:12px; font-weight:600; font-size:16px; transition:all 0.3s; }
    .download-btn:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(102,126,234,0.4); }
    .branding { margin-top:24px; font-size:13px; color:rgba(255,255,255,0.3); text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="file-info">
      <div class="file-icon">${fileType === 'image' ? '🖼️' : fileType === 'video' ? '🎬' : fileType === 'audio' ? '🎵' : fileType === 'pdf' ? '📕' : '📄'}</div>
      <div class="file-details">
        <h2>${originalName}</h2>
        <p>${formatSize(stats.size)} • ${ext.replace('.', '').toUpperCase()}</p>
      </div>
    </div>
    <div class="preview">${previewHtml}</div>
    <a href="${fileUrl}" download="${originalName}" class="download-btn">⬇️ Download File</a>
  </div>
  <p class="branding">Shared via QR File Share</p>
</body>
</html>
  `);
});

// List uploaded files
app.get('/api/files', (req, res) => {
  const files = fs.readdirSync(uploadsDir).map(filename => {
    const filepath = path.join(uploadsDir, filename);
    const stats = fs.statSync(filepath);
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(files);
});

// Delete file
app.delete('/api/files/:filename', (req, res) => {
  const filepath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n🚀 QR File Share is running!\n');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log('\n📱 Same WiFi-তে connected devices থেকে QR code scan করে file download করতে পারবে!\n');
});
