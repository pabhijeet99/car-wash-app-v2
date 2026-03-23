// =============================================
// GARAGE MANAGER - Service History
// =============================================

var HISTORY = {

  load: function(customerID) {
    var container = document.getElementById('history-content');
    container.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 14px"></div>Loading history...</div>';

    SHEETS.getServiceHistory(customerID).then(function(records) {
      if (!records || records.length === 0) {
        container.innerHTML = '<div class="no-results"><div class="no-results-icon"><i data-lucide="bar-chart-3"></i></div><p>No service history found</p></div>';
        renderIcons();
        return;
      }

      var totalSpent = 0;
      records.forEach(function(r) { totalSpent += (parseFloat(r.totalAmount) || 0); });

      var html = '<div class="customer-summary-card">' +
        '<h3>Service History</h3>' +
        '<div class="customer-meta"><span>' + records.length + ' visit(s)</span><span>\u20B9' + totalSpent.toLocaleString('en-IN') + ' total</span></div></div>';

      html += '<div class="section-label">Timeline</div>';
      html += '<div class="timeline">';

      records.forEach(function(r) {
        var statusClass = 'status-' + (r.status || 'open').toString().toLowerCase();
        html += '<div class="timeline-item" onclick="JOBLIST.openDetail(\'' + esc(r.jobCardNumber) + '\')">' +
          '<div class="timeline-dot"></div>' +
          '<div class="timeline-content">' +
          '<div class="timeline-date">' + esc(r.dateTimeIn) + '</div>' +
          '<div class="timeline-title">' + esc(r.jobCardNumber) + ' - ' + esc(r.serviceType) + '</div>' +
          '<div class="timeline-info"><i data-lucide="car" class="inline-icon"></i> ' + esc(r.vehicleInfo) + '</div>' +
          (r.totalAmount ? '<div class="timeline-amount">\u20B9' + r.totalAmount + ' <span class="status-badge ' + statusClass + '" style="font-size:10px">' + esc(r.paymentStatus || r.status) + '</span></div>' : '') +
          '</div></div>';
      });

      html += '</div>';
      container.innerHTML = html;
      renderIcons();
    }).catch(function(err) {
      container.innerHTML = '<div class="no-results"><p>Error: ' + esc(err.message) + '</p></div>';
    });
  }
};
