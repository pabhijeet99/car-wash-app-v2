// =============================================
// GARAGE MANAGER - Parts & QR Scanner
// =============================================

var PARTS = {
  scanner: null,

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
            // Auto-fill part number
            document.getElementById('part-number').value = decodedText;
            showToast('Scanned: ' + decodedText, 'success');
            self.closeScanner();
            // Auto-lookup from PartsMaster → Free APIs → Gemini AI
            self.lookupBarcode(decodedText);
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

  closeScanner: function() {
    if (this.scanner) {
      try {
        this.scanner.stop().then(function() {}).catch(function() {});
      } catch(e) {}
      this.scanner = null;
    }
    goBack();
  },

  // Lookup barcode: Local PartsMaster → Free APIs → Gemini AI
  lookupBarcode: async function(barcode) {
    if (!barcode) return;
    var resultDiv = document.getElementById('scan-lookup-result');
    if (resultDiv) {
      resultDiv.innerHTML =
        '<div class="scan-loading-card">' +
          '<div class="spinner" style="margin:0 auto 10px"></div>' +
          '<div style="font-size:13px;color:var(--text-label)">Looking up barcode...</div>' +
          '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Checking Local DB → Online APIs → AI</div>' +
        '</div>';
      resultDiv.hidden = false;
    }
    try {
      var result = await SHEETS.lookupPart(barcode);
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
        } else if (result.source === 'ai') {
          sourceIcon = 'sparkles'; sourceLabel = 'Identified by AI';
        } else {
          sourceIcon = 'globe'; sourceLabel = 'Found online';
        }

        // Confidence badge
        var confBadge = '';
        if (result.confidence) {
          var confColor = result.confidence === 'High' ? 'var(--success)' :
                          result.confidence === 'Medium' ? 'var(--warning, #f59e0b)' : 'var(--error, #ef4444)';
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
                'Barcode <strong>' + esc(barcode) + '</strong> not found in any database.<br>' +
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
            '<i data-lucide="wifi-off" style="color:var(--error);width:18px;height:18px"></i>' +
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
