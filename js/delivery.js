// =============================================
// GARAGE MANAGER - Delivery & Signature
// =============================================

var DELIVERY = {
  canvas: null,
  ctx: null,
  drawing: false,
  rating: 0,

  init: function() {
    var canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Set canvas size to match CSS
    canvas.width = canvas.offsetWidth || 320;
    canvas.height = 150;

    // Clear
    this.clearSignature();

    // Drawing events
    var self = this;

    canvas.addEventListener('mousedown', function(e) { self._startDraw(e); });
    canvas.addEventListener('mousemove', function(e) { self._draw(e); });
    canvas.addEventListener('mouseup', function() { self.drawing = false; });
    canvas.addEventListener('mouseleave', function() { self.drawing = false; });

    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); self._startDraw(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); self._draw(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchend', function() { self.drawing = false; });

    // Star rating
    document.querySelectorAll('#star-rating .star').forEach(function(star) {
      star.addEventListener('click', function() {
        self.rating = parseInt(this.getAttribute('data-val'));
        document.querySelectorAll('#star-rating .star').forEach(function(s) {
          s.classList.toggle('active', parseInt(s.getAttribute('data-val')) <= self.rating);
        });
      });
    });
  },

  _startDraw: function(e) {
    this.drawing = true;
    this.ctx.beginPath();
    var rect = this.canvas.getBoundingClientRect();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  },

  _draw: function(e) {
    if (!this.drawing) return;
    var rect = this.canvas.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.strokeStyle = '#1A237E';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  },

  clearSignature: function() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#F5F5F5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = '#CFD8DC';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    var mid = this.canvas.height * 0.7;
    this.ctx.beginPath();
    this.ctx.moveTo(10, mid);
    this.ctx.lineTo(this.canvas.width - 10, mid);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  },

  completeDelivery: async function() {
    showLoading('Completing delivery...');
    try {
      var signatureData = '';
      if (this.canvas) {
        signatureData = this.canvas.toDataURL('image/png');
      }

      await SHEETS.updateDelivery(JOBLIST.currentJobCard, {
        finalOdometer: document.getElementById('del-odo').value || '',
        deliveryNotes: document.getElementById('del-notes').value.trim(),
        reminderDate: document.getElementById('del-reminder').value || '',
        signatureData: signatureData
      });

      // Save rating/feedback
      if (this.rating > 0 || document.getElementById('del-feedback').value.trim()) {
        await SHEETS.updateJobCard(JOBLIST.currentJobCard, {
          status: 'Delivered',
          rating: this.rating,
          feedback: document.getElementById('del-feedback').value.trim()
        });
      }

      hideLoading();
      showToast('Vehicle delivered successfully!', 'success');

      // Reset
      document.getElementById('del-odo').value = '';
      document.getElementById('del-notes').value = '';
      document.getElementById('del-reminder').value = '';
      document.getElementById('del-feedback').value = '';
      this.rating = 0;
      document.querySelectorAll('#star-rating .star').forEach(function(s) { s.classList.remove('active'); });

      goBack();
      setTimeout(function() { JOBLIST.openDetail(JOBLIST.currentJobCard); }, 500);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  }
};

// Initialize signature canvas when delivery page is shown
document.addEventListener('DOMContentLoaded', function() {
  // Use MutationObserver to detect when delivery page becomes visible
  var observer = new MutationObserver(function() {
    var delPage = document.getElementById('page-delivery');
    if (delPage && delPage.classList.contains('active')) {
      setTimeout(function() { DELIVERY.init(); }, 100);
    }
  });
  var main = document.querySelector('.app-main');
  if (main) observer.observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
