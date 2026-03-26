// =============================================
// GARAGE MANAGER - Parts & QR Scanner + OCR
// =============================================

var PARTS = {
  scanner: null,
  videoElement: null,

  openScanner: function() {
    showPage('qr-scanner', 'Scan Code');
    var self = this;
    setTimeout(function() {
      try {
        self.scanner = new Html5Qrcode('qr-reader');
        self.scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          function(decodedText) {
            // Capture a photo frame from the camera before closing
            var photoData = self.captureFrame();

            // Auto-fill part number
            document.getElementById('part-number').value = decodedText;
            showToast('Scanned: ' + decodedText, 'success');
            self.closeScanner();

            // Lookup with barcode + photo (OCR)
            self.lookupBarcode(decodedText, photoData);
          },
          function() {} // ignore scan errors
        ).catch(function(err) {
          showToast('Camera error: ' + err, 'error');
          self.closeScanner();
        });
      } catch (err) {
        showToast('Scanner not available', 'error');
        goBack();
      }
    }, 300);
  },

  // Capture a frame from the video element as base64 JPEG
  captureFrame: function() {
    try {
      var video = document.querySelector('#qr-reader video');
      if (!video || !video.videoWidth) return null;

      var canvas = document.createElement('canvas');
      // Use reasonable resolution for OCR (max 800px wide)
      var scale = Math.min(1, 800 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Return base64 JPEG (no data: prefix, just the base64 string)
      var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return dataUrl.split(',')[1]; // remove "data:image/jpeg;base64,"
    } catch(e) {
      return null;
    }
  },

  closeScanner: function() {
    if (this.scanner) {
      try {
        this.scanner.stop().then(function() {}).catch(function() {});
      } catch(e) {}
      this.scanner = null;
    }
    goBack();
  },

  // Lookup barcode: Local PartsMaster → Free APIs → Gemini AI (with OCR photo)
  lookupBarcode: async function(barcode, photoBase64) {
    if (!barcode) return;
    var resultDiv = document.getElementById('scan-lookup-result');
    if (resultDiv) {
      resultDiv.innerHTML =
        '<div class="scan-loading-card">' +
          '<div class="spinner" style="margin:0 auto 10px"></div>' +
          '<div style="font-size:13px;color:var(--text-label)">Identifying product...</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">' +
            (photoBase64 ? 'Reading label + checking databases + AI...' : 'Checking Local DB → Online APIs → AI...') +
          '</div>' +
        '</div>';
      resultDiv.hidden = false;
    }
    try {
      var result = await SHEETS.lookupPart(barcode, photoBase64);
      if (result && result.found) {
        // Auto-fill form fields
        document.getElementById('part-name').value = result.partName || '';
        document.getElementById('part-price').value = result.mrp || '';
        if (result.brand) {
          document.getElementById('part-supplier').value = result.brand || '';
        }

        // Source label with icon
        var sourceIcon = '', sourceLabel = '';
        if (result.source === 'local') {
          sourceIcon = 'database'; sourceLabel = 'From your database';
        } else if (result.source === 'ai' || result.source === 'ai-ocr') {
          sourceIcon = 'sparkles';
          sourceLabel = result.source === 'ai-ocr' ? 'AI read the label' : 'Identified by AI';
        } else {
          sourceIcon = 'globe'; sourceLabel = 'Found online';
        }

        // Confidence badge
        var confBadge = '';
        if (result.confidence) {
          var confColor = result.confidence === 'High' ? 'var(--success)' :
                          result.confidence === 'Medium' ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)';
          confBadge = '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;' +
            'background:' + confColor + '22;color:' + confColor + ';font-weight:600">' +
            result.confidence + ' confidence</span>';
        }

        // Build result card
        var html = '<div class="scan-result-card found">' +
          '<div class="scan-result-header">' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<i data-lucide="check-circle" style="color:var(--success);width:20px;height:20px"></i>' +
              '<span style="font-weight:700;font-size:15px">Part Identified</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<i data-lucide="' + sourceIcon + '" style="width:14px;height:14px;color:var(--text-muted)"></i>' +
              '<span style="font-size:11px;color:var(--text-muted)">' + sourceLabel + '</span>' +
              confBadge +
            '</div>' +
          '</div>' +
          '<div class="scan-result-body">' +
            '<div class="scan-result-row main">' +
              '<span class="scan-label">Product</span>' +
              '<span class="scan-value">' + esc(result.partName || '') + '</span>' +
            '</div>';

        if (result.brand) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">Brand</span>' +
            '<span class="scan-value">' + esc(result.brand) + '</span>' +
          '</div>';
        }
        if (result.mrp) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">MRP</span>' +
            '<span class="scan-value price">&#8377; ' + esc(String(result.mrp)) + '</span>' +
          '</div>';
        }
        if (result.category) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">Category</span>' +
            '<span class="scan-value">' + esc(result.category) + '</span>' +
          '</div>';
        }
        if (result.subCategory) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">Sub-Category</span>' +
            '<span class="scan-value">' + esc(result.subCategory) + '</span>' +
          '</div>';
        }
        if (result.specifications) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">Specs</span>' +
            '<span class="scan-value">' + esc(result.specifications) + '</span>' +
          '</div>';
        }
        if (result.vehicleCompatibility) {
          html += '<div class="scan-result-row">' +
            '<span class="scan-label">Fits</span>' +
            '<span class="scan-value">' + esc(result.vehicleCompatibility) + '</span>' +
          '</div>';
        }

        html += '</div></div>';

        if (resultDiv) {
          resultDiv.innerHTML = html;
          renderIcons();
        }
        showToast('Part found: ' + result.partName, 'success');
      } else {
        if (resultDiv) {
          resultDiv.innerHTML =
            '<div class="scan-result-card notfound">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
                '<i data-lucide="search-x" style="color:var(--warning, #f59e0b);width:20px;height:20px"></i>' +
                '<span style="font-weight:700;font-size:14px">Part Not Found</span>' +
              '</div>' +
              '<div style="font-size:12px;color:var(--text-muted);line-height:1.5">' +
                'Barcode <strong>' + esc(barcode) + '</strong> not recognized.<br>' +
                'Fill the details manually below. It will be saved for future scans automatically.' +
              '</div>' +
            '</div>';
          renderIcons();
        }
        showToast('New part - enter details manually', 'info');
      }
    } catch(e) {
      if (resultDiv) {
        resultDiv.innerHTML =
          '<div class="scan-result-card notfound">' +
            '<i data-lucide="wifi-off" style="color:var(--danger);width:18px;height:18px"></i>' +
            '<span style="font-size:13px;margin-left:8px">Lookup failed. Fill details manually.</span>' +
          '</div>';
        renderIcons();
      }
    }
  },

  savePart: async function() {
    var name = document.getElementById('part-name').value.trim();
    if (!name) { showToast('Part name required', 'error'); return; }

    showLoading('Adding part...');
    try {
      await SHEETS.addParts(JOBLIST.currentJobCard, {
        partName: name,
        partNumber: document.getElementById('part-number').value.trim(),
        qty: document.getElementById('part-qty').value || 1,
        unitPrice: document.getElementById('part-price').value || 0,
        supplier: document.getElementById('part-supplier').value.trim(),
        warranty: document.getElementById('part-warranty').value.trim()
      });
      hideLoading();
      showToast('Part added!', 'success');

      // Reset form
      document.getElementById('part-name').value = '';
      document.getElementById('part-number').value = '';
      document.getElementById('part-qty').value = '1';
      document.getElementById('part-price').value = '';
      document.getElementById('part-supplier').value = '';
      document.getElementById('part-warranty').value = '';
      var scanResult = document.getElementById('scan-lookup-result');
      if (scanResult) { scanResult.innerHTML = ''; scanResult.hidden = true; }

      goBack();
      setTimeout(function() { JOBLIST.openDetail(JOBLIST.currentJobCard); }, 500);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  }
};
