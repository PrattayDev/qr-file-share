import { upload } from 'https://esm.sh/@vercel/blob/client';

// ===== DOM Elements =====
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressFileName = document.getElementById('progressFileName');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const resultSection = document.getElementById('resultSection');
const qrCodeImage = document.getElementById('qrCodeImage');
const resultFileName = document.getElementById('resultFileName');
const resultFileSize = document.getElementById('resultFileSize');
const resultFileUrl = document.getElementById('resultFileUrl');
const downloadQrBtn = document.getElementById('downloadQrBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
const historyList = document.getElementById('historyList');

// ===== Upload History (stored in localStorage) =====
let uploadHistory = JSON.parse(localStorage.getItem('qrFileShareHistory_v2') || '[]');

// ===== Helper Functions =====
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  const b = parseInt(bytes);
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
  return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const icons = {
    // Images
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️', 'bmp': '🖼️',
    // Videos
    'mp4': '🎬', 'webm': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬',
    // Audio
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'aac': '🎵', 'flac': '🎵', 'm4a': '🎵',
    // Documents
    'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📊', 'xlsx': '📊', 'ppt': '📙', 'pptx': '📙',
    // Code
    'js': '💻', 'py': '💻', 'html': '💻', 'css': '💻', 'json': '💻',
    // Archives
    'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    // Text
    'txt': '📝', 'md': '📝', 'csv': '📝',
  };
  return icons[ext] || '📄';
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ===== Drag & Drop =====
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileUpload(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileUpload(e.target.files[0]);
  }
});

// ===== Generate QR Code =====
async function generateQRDataUrl(text) {
  if (window.QRCode && QRCode.toDataURL) {
    return await QRCode.toDataURL(text, {
      width: 420,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  }
  // Fallback to quick QR API
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
}

// ===== Upload File =====
async function handleFileUpload(file) {
  if (!file) return;

  // Max 500MB
  if (file.size > 500 * 1024 * 1024) {
    showToast('⚠️ ফাইল সাইজ ৫০০MB এর কম হতে হবে!', true);
    return;
  }

  // Show progress
  progressContainer.style.display = 'block';
  progressFileName.textContent = file.name;
  progressPercent.textContent = '০%';
  progressFill.style.width = '5%';
  resultSection.style.display = 'none';

  try {
    // Direct Cloud Upload via Vercel Blob Client
    const newBlob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      onUploadProgress: (progress) => {
        const percent = Math.round(progress.percentage);
        progressPercent.textContent = percent + '%';
        progressFill.style.width = Math.max(5, percent) + '%';
      }
    });

    progressFill.style.width = '100%';
    progressPercent.textContent = '১০০%';

    setTimeout(async () => {
      progressContainer.style.display = 'none';

      // Build universal share link (clean URL)
      const viewUrl = `${window.location.origin}/view?url=${encodeURIComponent(newBlob.url)}&name=${encodeURIComponent(file.name)}&size=${file.size}`;
      const qrDataUrl = await generateQRDataUrl(viewUrl);

      const resultData = {
        name: file.name,
        size: file.size,
        blobUrl: newBlob.url,
        viewUrl: viewUrl,
        qrCode: qrDataUrl,
        uploadedAt: new Date().toISOString()
      };

      displayResult(resultData);
      addToHistory(resultData);
      showToast('✅ ফাইল ক্লাউডে আপলোড ও QR Code তৈরি হয়েছে!');
    }, 400);

  } catch (error) {
    console.error('Upload error:', error);
    progressContainer.style.display = 'none';
    showToast('❌ আপলোড ব্যর্থ হয়েছে: ' + (error.message || 'Error'), true);
  }
}

// ===== Display Result =====
function displayResult(data) {
  resultSection.style.display = 'block';
  qrCodeImage.src = data.qrCode;
  resultFileName.textContent = data.name;
  resultFileSize.textContent = formatFileSize(data.size);
  resultFileUrl.value = data.viewUrl;

  resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== Download QR Code =====
downloadQrBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `QR-${resultFileName.textContent || 'file'}.png`;
  link.href = qrCodeImage.src;
  link.click();
  showToast('📥 QR Code ডাউনলোড হচ্ছে!');
});

// ===== Copy Link =====
copyLinkBtn.addEventListener('click', () => {
  resultFileUrl.select();
  navigator.clipboard.writeText(resultFileUrl.value).then(() => {
    showToast('📋 লিংক কপি হয়েছে!');
    copyLinkBtn.textContent = '✅';
    setTimeout(() => { copyLinkBtn.textContent = '📋'; }, 2000);
  }).catch(() => {
    document.execCommand('copy');
    showToast('📋 লিংক কপি হয়েছে!');
  });
});

// ===== Upload Another =====
uploadAnotherBtn.addEventListener('click', () => {
  resultSection.style.display = 'none';
  fileInput.value = '';
  dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ===== History Management =====
function addToHistory(data) {
  uploadHistory.unshift(data);
  if (uploadHistory.length > 20) uploadHistory = uploadHistory.slice(0, 20);
  localStorage.setItem('qrFileShareHistory_v2', JSON.stringify(uploadHistory));
  renderHistory();
}

function renderHistory() {
  if (uploadHistory.length === 0) {
    historyList.innerHTML = '<p class="empty-state">কোনো ফাইল আপলোড হয়নি এখনও</p>';
    return;
  }

  historyList.innerHTML = uploadHistory.map((item, index) => `
    <div class="history-item">
      <div class="history-item-info">
        <span class="history-item-icon">${getFileIcon(item.name)}</span>
        <div class="history-item-details">
          <div class="history-item-name" title="${item.name}">${item.name}</div>
          <div class="history-item-meta">${formatFileSize(item.size)} • ${new Date(item.uploadedAt).toLocaleString('bn-BD')}</div>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="btn-icon" data-action="view-qr" data-index="${index}" title="QR Code দেখুন">📱</button>
        <button class="btn-icon" data-action="copy-link" data-index="${index}" title="লিংক কপি করুন">🔗</button>
        <a class="btn-icon" href="${item.viewUrl}" target="_blank" title="ওপেন করুন">👁️</a>
        <button class="btn-icon danger" data-action="delete" data-index="${index}" title="মুছে ফেলুন">🗑️</button>
      </div>
    </div>
  `).join('');

  // Event Delegation for history actions
  historyList.querySelectorAll('.btn-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.index);
      if (isNaN(idx)) return;
      const item = uploadHistory[idx];

      if (action === 'view-qr') {
        displayResult(item);
      } else if (action === 'copy-link') {
        navigator.clipboard.writeText(item.viewUrl).then(() => {
          showToast('📋 লিংক কপি হয়েছে!');
        });
      } else if (action === 'delete') {
        uploadHistory.splice(idx, 1);
        localStorage.setItem('qrFileShareHistory_v2', JSON.stringify(uploadHistory));
        renderHistory();
        showToast('🗑️ তালিকা থেকে মুছে ফেলা হয়েছে!');
      }
    });
  });
}

// ===== Initialize =====
renderHistory();
