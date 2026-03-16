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
            // Auto-lookup from PartsMaster
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

  // Lookup barcode in PartsMaster and auto-fill name + MRP
  lookupBarcode: async function(barcode) {
    if (!barcode) return;
    try {
      var result = await SHEETS.lookupPart(barcode);
      if (result && result.found) {
        document.getElementById('part-name').value = result.partName || '';
        document.getElementById('part-price').value = result.mrp || '';
        if (result.brand) {
          document.getElementById('part-supplier').value = result.brand || '';
        }
        showToast('Part found: ' + result.partName, 'success');
      } else {
        showToast('New part - fill details manually', 'info');
      }
    } catch(e) {
      // Silent fail - user can fill manually
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

      goBack();
      setTimeout(function() { JOBLIST.openDetail(JOBLIST.currentJobCard); }, 500);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  }
};
