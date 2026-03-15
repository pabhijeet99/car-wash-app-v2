// =============================================
// GARAGE MANAGER - Billing
// =============================================

var BILLING = {

  openBilling: function() {
    // Auto-calculate parts cost from job detail
    showPage('billing', 'Create Bill');
    // Reset fields
    document.getElementById('bill-labour').value = '';
    document.getElementById('bill-parts').value = '0';
    document.getElementById('bill-discount').value = '0';
    document.getElementById('bill-tax-pct').value = '18';
    document.getElementById('bill-tax-amt').value = '';
    document.getElementById('bill-total').textContent = '\u20B90';
    document.getElementById('bill-paid').value = '';

    // Load parts cost from the job card detail
    SHEETS.getJobCard(JOBLIST.currentJobCard).then(function(data) {
      if (data.parts && data.parts.length > 0) {
        var total = 0;
        data.parts.forEach(function(p) { total += (parseFloat(p.totalPrice) || 0); });
        document.getElementById('bill-parts').value = total;
        BILLING.calculate();
      }
    }).catch(function() {});
  },

  calculate: function() {
    var labour = parseFloat(document.getElementById('bill-labour').value) || 0;
    var parts = parseFloat(document.getElementById('bill-parts').value) || 0;
    var discount = parseFloat(document.getElementById('bill-discount').value) || 0;
    var taxPct = parseFloat(document.getElementById('bill-tax-pct').value) || 0;

    var subtotal = labour + parts - discount;
    var taxAmt = Math.round(subtotal * taxPct / 100);
    var total = subtotal + taxAmt;

    document.getElementById('bill-tax-amt').value = taxAmt;
    document.getElementById('bill-total').textContent = '\u20B9' + total.toLocaleString('en-IN');
  },

  saveBill: async function() {
    var labour = document.getElementById('bill-labour').value;
    if (!labour) { showToast('Enter labour charges', 'error'); return; }

    showLoading('Creating bill...');
    try {
      var result = await SHEETS.createBilling(JOBLIST.currentJobCard, {
        labourCharges: labour,
        discount: document.getElementById('bill-discount').value || 0,
        taxPercent: document.getElementById('bill-tax-pct').value || 18,
        paymentMethod: document.getElementById('bill-method').value,
        paidAmount: document.getElementById('bill-paid').value || 0
      });
      hideLoading();
      showToast('Bill created! Total: \u20B9' + result.totalAmount, 'success');
      goBack();
      setTimeout(function() { JOBLIST.openDetail(JOBLIST.currentJobCard); }, 500);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  }
};
