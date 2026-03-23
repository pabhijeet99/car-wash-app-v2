// =============================================
// GARAGE MANAGER - Job Card List & Detail
// =============================================

var JOBLIST = {
  currentFilter: 'all',
  currentJobCard: '',

  load: function(status) {
    status = status || this.currentFilter;
    var container = document.getElementById('job-list-content');
    container.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 14px"></div>Loading jobs...</div>';

    SHEETS.getJobCards(status).then(function(jobs) {
      if (!jobs || jobs.length === 0) {
        container.innerHTML = '<div class="no-results"><div class="no-results-icon"><i data-lucide="clipboard-list"></i></div><p>No job cards found</p></div>';
        renderIcons();
        return;
      }
      var html = '';
      jobs.forEach(function(j) {
        var statusClass = 'status-' + (j.status || 'open').toString().toLowerCase();
        var priorityClass = 'priority-' + (j.priority || 'medium').toString().toLowerCase();
        html += '<div class="job-card-item" onclick="JOBLIST.openDetail(\'' + esc(j.jobCardNumber) + '\')">' +
          '<div class="jc-top"><span class="jc-number">' + esc(j.jobCardNumber) + '</span><span class="status-badge ' + statusClass + '">' + esc(j.status) + '</span></div>' +
          '<div class="jc-info"><i data-lucide="user" class="inline-icon"></i> ' + esc(j.customerName) + ' &bull; <i data-lucide="car" class="inline-icon"></i> ' + esc(j.vehicleNumber) + '</div>' +
          '<div class="jc-info"><i data-lucide="wrench" class="inline-icon"></i> ' + esc(j.serviceType) + ' &bull; <span class="' + priorityClass + '">' + esc(j.priority) + '</span></div>' +
          '<div class="jc-date">' + esc(j.dateTimeIn) + '</div></div>';
      });
      container.innerHTML = html;
      renderIcons();
    }).catch(function(err) {
      container.innerHTML = '<div class="no-results"><p>' + esc(err.message) + '</p></div>';
    });
  },

  filter: function(status, btn) {
    this.currentFilter = status;
    document.querySelectorAll('#job-status-filter .toggle-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    this.load(status);
  },

  openDetail: function(jcNumber) {
    this.currentJobCard = jcNumber;
    showPage('job-detail', 'Job Card');
    var container = document.getElementById('job-detail-content');
    container.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 14px"></div>Loading...</div>';

    SHEETS.getJobCard(jcNumber).then(function(data) {
      if (data.error) { container.innerHTML = '<div class="no-results"><p>' + esc(data.error) + '</p></div>'; return; }
      var jc = data.jobCard;
      var c = data.customer;
      var v = data.vehicle;
      var statusClass = 'status-' + (jc.status || 'open').toString().toLowerCase();

      var html = '<div class="detail-header">' +
        '<div class="jc-top"><span class="jc-number">' + esc(jc.jobCardNumber) + '</span><span class="status-badge ' + statusClass + '">' + esc(jc.status) + '</span></div>' +
        '<div class="detail-meta">' + esc(jc.dateTimeIn) + ' &bull; ' + esc(jc.serviceType) + ' &bull; ' + esc(jc.priority) + '</div></div>';

      // Customer
      html += '<div class="detail-section"><div class="detail-title"><i data-lucide="user" class="detail-icon"></i> Customer</div>' +
        '<div class="detail-row">' + esc(c.name || '') + ' &bull; ' + esc(c.mobile || '') + '</div>' +
        (c.address ? '<div class="detail-row">' + esc(c.address) + ', ' + esc(c.city || '') + '</div>' : '') + '</div>';

      // Vehicle
      html += '<div class="detail-section"><div class="detail-title"><i data-lucide="car" class="detail-icon"></i> Vehicle</div>' +
        '<div class="detail-row">' + esc(v.vehicleNumber || '') + ' - ' + esc(v.brand || '') + ' ' + esc(v.model || '') + ' ' + esc(v.variant || '') + '</div>' +
        '<div class="detail-row">' + esc(v.fuelType || '') + ' &bull; ' + esc(v.year || '') + ' &bull; ' + esc(v.color || '') +
        (v.odometer ? ' &bull; ' + v.odometer + ' km' : '') + '</div></div>';

      // Complaints
      if (jc.complaintType || jc.complaintText) {
        html += '<div class="detail-section"><div class="detail-title">&#9888; Complaints</div>' +
          (jc.complaintType ? '<div class="detail-row">' + esc(jc.complaintType) + '</div>' : '') +
          (jc.complaintText ? '<div class="detail-row" style="color:var(--text-muted)">' + esc(jc.complaintText) + '</div>' : '') + '</div>';
      }

      // Inspection
      if (data.inspection && data.inspection.length > 0) {
        html += '<div class="detail-section"><div class="detail-title"><i data-lucide="search-check" class="detail-icon"></i> Inspection</div>';
        data.inspection.forEach(function(ins) {
          var badge = ins.status === 'OK' ? 'insp-ok' : (ins.status === 'NeedsRepair' ? 'insp-repair' : 'insp-replace');
          html += '<div class="detail-row"><span class="insp-badge ' + badge + '">' + esc(ins.status) + '</span> ' + esc(ins.item) +
            (ins.notes ? ' - <em>' + esc(ins.notes) + '</em>' : '') + '</div>';
        });
        html += '</div>';
      }

      // Work Performed
      html += '<div class="detail-section"><div class="detail-title">&#128295; Work Performed</div>';
      if (data.work && data.work.length > 0) {
        data.work.forEach(function(w) {
          var wClass = w.status === 'Done' ? 'status-completed' : (w.status === 'InProgress' ? 'status-inprogress' : 'status-open');
          html += '<div class="detail-row"><span class="status-badge ' + wClass + '" style="font-size:10px">' + esc(w.status) + '</span> ' +
            esc(w.taskName) + ' - ' + esc(w.technician) + (w.timeTaken ? ' (' + w.timeTaken + ' min)' : '') + '</div>';
        });
      } else {
        html += '<div class="detail-row" style="color:var(--text-muted)">No work recorded yet</div>';
      }
      html += '<button class="btn-sm" onclick="showPage(\'work\',\'Add Work\')">+ Add Work</button></div>';

      // Parts
      html += '<div class="detail-section"><div class="detail-title">&#9881; Parts Used</div>';
      if (data.parts && data.parts.length > 0) {
        data.parts.forEach(function(p) {
          html += '<div class="detail-row">' + esc(p.partName) + ' (x' + p.qty + ') - \u20B9' + p.totalPrice +
            (p.partNumber ? ' [' + esc(p.partNumber) + ']' : '') + '</div>';
        });
      } else {
        html += '<div class="detail-row" style="color:var(--text-muted)">No parts added yet</div>';
      }
      html += '<button class="btn-sm" onclick="showPage(\'parts\',\'Add Part\')">+ Add Part</button></div>';

      // Billing
      html += '<div class="detail-section"><div class="detail-title">&#128176; Billing</div>';
      if (data.billing) {
        var b = data.billing;
        html += '<div class="detail-row">Labour: \u20B9' + b.labourCharges + ' | Parts: \u20B9' + b.partsCost + ' | Discount: \u20B9' + b.discount + '</div>' +
          '<div class="detail-row">Tax: \u20B9' + b.taxAmount + ' | <strong>Total: \u20B9' + b.totalAmount + '</strong></div>' +
          '<div class="detail-row">Payment: ' + esc(b.paymentStatus) + ' (' + esc(b.paymentMethod) + ')</div>';
      } else {
        html += '<div class="detail-row" style="color:var(--text-muted)">No bill created yet</div>';
        html += '<button class="btn-sm" onclick="BILLING.openBilling()">+ Create Bill</button>';
      }
      html += '</div>';

      // Delivery
      if (jc.status !== 'Delivered') {
        html += '<div class="detail-section">' +
          '<button class="btn-primary btn-success" onclick="showPage(\'delivery\',\'Delivery\')">&#10003; Complete Delivery</button>' +
          '</div>';
      } else {
        html += '<div class="detail-section"><div class="detail-title">&#128666; Delivered</div>' +
          '<div class="detail-row">Date: ' + esc(jc.deliveryDate) + '</div>' +
          (jc.finalOdometer ? '<div class="detail-row">Odometer: ' + jc.finalOdometer + ' km</div>' : '') +
          (jc.rating ? '<div class="detail-row">Rating: ' + '&#9733;'.repeat(parseInt(jc.rating)) + '</div>' : '') +
          (jc.feedback ? '<div class="detail-row"><em>' + esc(jc.feedback) + '</em></div>' : '') + '</div>';
      }

      // Status update buttons
      if (jc.status !== 'Delivered') {
        html += '<div class="detail-section"><div class="detail-title">Update Status</div><div class="status-buttons">';
        ['Open', 'InProgress', 'Completed'].forEach(function(st) {
          var active = jc.status === st ? ' active' : '';
          html += '<button class="status-btn' + active + '" onclick="JOBLIST.updateStatus(\'' + esc(jc.jobCardNumber) + '\',\'' + st + '\')">' + st + '</button>';
        });
        html += '</div></div>';
      }

      container.innerHTML = html;
      renderIcons();
    }).catch(function(err) {
      container.innerHTML = '<div class="no-results"><p>Error: ' + esc(err.message) + '</p></div>';
    });
  },

  updateStatus: async function(jcNumber, status) {
    showLoading('Updating...');
    try {
      await SHEETS.updateJobCard(jcNumber, { status: status });
      hideLoading();
      showToast('Status updated to ' + status, 'success');
      this.openDetail(jcNumber);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  },

  saveWork: async function() {
    var task = document.getElementById('work-task').value.trim();
    var tech = document.getElementById('work-tech').value.trim();
    if (!task) { showToast('Task name required', 'error'); return; }
    if (!tech) { showToast('Technician required', 'error'); return; }

    showLoading('Adding work...');
    try {
      await SHEETS.addWork(this.currentJobCard, {
        taskName: task,
        technician: tech,
        timeTaken: document.getElementById('work-time').value || '',
        workStatus: document.getElementById('work-status').value
      });
      hideLoading();
      showToast('Work added!', 'success');
      document.getElementById('work-task').value = '';
      document.getElementById('work-tech').value = '';
      document.getElementById('work-time').value = '';
      goBack();
      // Reload detail after a moment
      setTimeout(function() { JOBLIST.openDetail(JOBLIST.currentJobCard); }, 500);
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  }
};
