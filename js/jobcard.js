// =============================================
// GARAGE MANAGER - Job Card Wizard
// =============================================

var JOB = {
  currentStep: 1,
  selectedCustomerID: '',
  selectedVehicleID: '',
  complaintPhotos: [],

  goStep: function(step) {
    // Validate before advancing
    if (step > this.currentStep) {
      if (this.currentStep === 1 && !this._validateStep1()) return;
      if (this.currentStep === 2 && !this._validateStep2()) return;
    }

    // Build review on step 5
    if (step === 5) this._buildReview();

    // Build inspection grid on step 4 (first time)
    if (step === 4 && document.getElementById('inspection-grid').innerHTML === '') this._buildInspectionGrid();

    document.querySelectorAll('.wiz-step').forEach(function(el) { el.hidden = true; });
    document.getElementById('wiz-step-' + step).hidden = false;
    this.currentStep = step;

    // Update progress
    document.querySelectorAll('.wprog-step').forEach(function(el) {
      var s = parseInt(el.getAttribute('data-wstep'));
      el.classList.remove('active', 'done');
      if (s === step) el.classList.add('active');
      else if (s < step) el.classList.add('done');
    });

    document.querySelector('.app-main').scrollTop = 0;
  },

  _validateStep1: function() {
    var phone = document.getElementById('jc-phone').value.trim();
    var name = document.getElementById('jc-name').value.trim();
    var vehNum = document.getElementById('jc-veh-number').value.trim();
    var brand = document.getElementById('jc-veh-brand').value.trim();
    var model = document.getElementById('jc-veh-model').value.trim();

    if (!phone || !/^\d{10}$/.test(phone)) { showToast('Enter valid 10-digit phone', 'error'); return false; }
    if (!name) { showToast('Customer name required', 'error'); return false; }
    if (!vehNum) { showToast('Vehicle number required', 'error'); return false; }
    if (!brand) { showToast('Vehicle brand required', 'error'); return false; }
    if (!model) { showToast('Vehicle model required', 'error'); return false; }
    return true;
  },

  _validateStep2: function() {
    return true; // All fields optional or have defaults
  },

  lookupCustomer: async function() {
    var phone = document.getElementById('jc-phone').value.trim();
    if (!phone || phone.length < 10) { showToast('Enter 10-digit phone', 'error'); return; }

    var resultDiv = document.getElementById('customer-lookup-result');
    resultDiv.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 10px"></div>Looking up...</div>';

    try {
      var data = await SHEETS.searchCustomer(phone);
      if (data.found) {
        var c = data.customer;
        this.selectedCustomerID = c.customerID;

        // Pre-fill customer fields
        document.getElementById('jc-name').value = c.name || '';
        document.getElementById('jc-alt-phone').value = c.altPhone || '';
        document.getElementById('jc-email').value = c.email || '';
        document.getElementById('jc-address').value = c.address || '';
        document.getElementById('jc-city').value = c.city || '';

        resultDiv.innerHTML = '<div class="lookup-found">&#10003; Found: <strong>' + esc(c.name) + '</strong> (' + esc(c.customerID) + ')</div>';

        // Show vehicle selection if customer has vehicles
        if (data.vehicles && data.vehicles.length > 0) {
          var vhtml = '<div class="form-section-title">Select Vehicle or Add New</div>';
          data.vehicles.forEach(function(v) {
            vhtml += '<div class="vehicle-select-card" onclick="JOB.selectVehicle(\'' + esc(v.vehicleID) + '\',\'' + esc(v.vehicleNumber) + '\',\'' + esc(v.brand) + '\',\'' + esc(v.model) + '\',\'' + esc(v.variant) + '\',\'' + esc(v.color) + '\',\'' + esc(v.fuelType) + '\',\'' + esc(v.year) + '\')">' +
              '<strong><i data-lucide="car" class="inline-icon"></i> ' + esc(v.vehicleNumber) + '</strong> - ' + esc(v.brand) + ' ' + esc(v.model) +
              (v.color ? ' (' + esc(v.color) + ')' : '') + '</div>';
          });
          vhtml += '<div class="vehicle-select-card" onclick="JOB.newVehicle()" style="color:var(--primary);text-align:center"><strong>+ Add New Vehicle</strong></div>';
          document.getElementById('vehicle-selection').innerHTML = vhtml;
          document.getElementById('vehicle-selection').style.display = 'block';
          renderIcons();
          document.getElementById('vehicle-fields').style.display = 'none';
        }
      } else {
        this.selectedCustomerID = '';
        resultDiv.innerHTML = '<div class="lookup-notfound">New customer - fill in details below</div>';
        document.getElementById('vehicle-selection').style.display = 'none';
        document.getElementById('vehicle-fields').style.display = 'block';
      }
    } catch (err) {
      resultDiv.innerHTML = '<div class="lookup-notfound">' + esc(err.message) + '</div>';
    }
  },

  selectVehicle: function(vid, number, brand, model, variant, color, fuel, year) {
    this.selectedVehicleID = vid;
    document.getElementById('jc-veh-number').value = number;
    document.getElementById('jc-veh-brand').value = brand;
    document.getElementById('jc-veh-model').value = model;
    document.getElementById('jc-veh-variant').value = variant || '';
    document.getElementById('jc-veh-color').value = color || '';
    document.getElementById('jc-veh-fuel').value = fuel || 'Petrol';
    document.getElementById('jc-veh-year').value = year || '';
    document.getElementById('vehicle-fields').style.display = 'block';
    document.getElementById('vehicle-selection').style.display = 'none';
    showToast('Vehicle selected', 'success');
  },

  newVehicle: function() {
    this.selectedVehicleID = '';
    document.getElementById('jc-veh-number').value = '';
    document.getElementById('jc-veh-brand').value = '';
    document.getElementById('jc-veh-model').value = '';
    document.getElementById('jc-veh-variant').value = '';
    document.getElementById('jc-veh-color').value = '';
    document.getElementById('jc-veh-year').value = '';
    document.getElementById('jc-veh-odo').value = '';
    document.getElementById('vehicle-fields').style.display = 'block';
    document.getElementById('vehicle-selection').style.display = 'none';
  },

  _buildInspectionGrid: function() {
    var items = ['Engine', 'Brake', 'Tire', 'Battery', 'Oil Level', 'Coolant', 'Lights', 'Suspension'];
    var html = '';
    items.forEach(function(item, idx) {
      html += '<div class="insp-item">' +
        '<div class="insp-label">' + item + '</div>' +
        '<div class="insp-options">' +
        '<label class="insp-radio"><input type="radio" name="insp-' + idx + '" value="OK" checked /><span class="insp-badge insp-ok">OK</span></label>' +
        '<label class="insp-radio"><input type="radio" name="insp-' + idx + '" value="NeedsRepair" /><span class="insp-badge insp-repair">Repair</span></label>' +
        '<label class="insp-radio"><input type="radio" name="insp-' + idx + '" value="Replace" /><span class="insp-badge insp-replace">Replace</span></label>' +
        '</div>' +
        '<input type="text" class="insp-notes" placeholder="Notes..." data-item="' + item + '" />' +
        '</div>';
    });
    document.getElementById('inspection-grid').innerHTML = html;
  },

  _getInspectionData: function() {
    var items = ['Engine', 'Brake', 'Tire', 'Battery', 'Oil Level', 'Coolant', 'Lights', 'Suspension'];
    var result = [];
    items.forEach(function(item, idx) {
      var radios = document.querySelectorAll('input[name="insp-' + idx + '"]');
      var status = 'OK';
      radios.forEach(function(r) { if (r.checked) status = r.value; });
      var notesEl = document.querySelector('.insp-notes[data-item="' + item + '"]');
      result.push({ item: item, status: status, notes: notesEl ? notesEl.value.trim() : '' });
    });
    return result;
  },

  _getComplaintTypes: function() {
    var types = [];
    document.querySelectorAll('.complaint-chips input:checked').forEach(function(cb) {
      types.push(cb.value);
    });
    return types;
  },

  _buildReview: function() {
    var name = document.getElementById('jc-name').value.trim();
    var phone = document.getElementById('jc-phone').value.trim();
    var veh = document.getElementById('jc-veh-number').value.trim();
    var brand = document.getElementById('jc-veh-brand').value.trim();
    var model = document.getElementById('jc-veh-model').value.trim();
    var stype = document.getElementById('jc-service-type').value;
    var priority = 'Medium';
    document.querySelectorAll('input[name="jc-priority"]').forEach(function(r) { if (r.checked) priority = r.value; });
    var complaints = this._getComplaintTypes();
    var inspection = this._getInspectionData();
    var needsRepair = inspection.filter(function(i) { return i.status !== 'OK'; });

    var html = '<div class="review-card">' +
      '<div class="review-section"><strong>Customer:</strong> ' + esc(name) + ' (' + esc(phone) + ')</div>' +
      '<div class="review-section"><strong>Vehicle:</strong> ' + esc(veh) + ' - ' + esc(brand) + ' ' + esc(model) + '</div>' +
      '<div class="review-section"><strong>Service:</strong> ' + esc(stype) + ' | <strong>Priority:</strong> ' + esc(priority) + '</div>';

    if (complaints.length > 0) {
      html += '<div class="review-section"><strong>Complaints:</strong> ' + complaints.map(esc).join(', ') + '</div>';
    }
    if (needsRepair.length > 0) {
      html += '<div class="review-section"><strong>Inspection Issues:</strong> ' + needsRepair.map(function(i) { return esc(i.item) + ' (' + esc(i.status) + ')'; }).join(', ') + '</div>';
    }
    html += '</div>';
    document.getElementById('job-review-summary').innerHTML = html;
  },

  saveJobCard: async function() {
    showLoading('Creating job card...');
    try {
      var priority = 'Medium';
      document.querySelectorAll('input[name="jc-priority"]').forEach(function(r) { if (r.checked) priority = r.value; });

      // Collect complaint photos as base64
      var photos = [];
      var photoInput = document.getElementById('jc-complaint-photos');
      if (photoInput && photoInput.files.length > 0) {
        for (var i = 0; i < Math.min(photoInput.files.length, 3); i++) {
          try { photos.push(await fileToBase64(photoInput.files[i])); } catch(e) {}
        }
      }

      var data = {
        customer: {
          customerID: this.selectedCustomerID,
          name: document.getElementById('jc-name').value.trim(),
          mobile: document.getElementById('jc-phone').value.trim(),
          altPhone: document.getElementById('jc-alt-phone').value.trim(),
          email: document.getElementById('jc-email').value.trim(),
          address: document.getElementById('jc-address').value.trim(),
          city: document.getElementById('jc-city').value.trim()
        },
        vehicle: {
          vehicleID: this.selectedVehicleID,
          vehicleNumber: document.getElementById('jc-veh-number').value.trim().toUpperCase(),
          brand: document.getElementById('jc-veh-brand').value.trim(),
          model: document.getElementById('jc-veh-model').value.trim(),
          variant: document.getElementById('jc-veh-variant').value.trim(),
          color: document.getElementById('jc-veh-color').value.trim(),
          fuelType: document.getElementById('jc-veh-fuel').value,
          year: document.getElementById('jc-veh-year').value,
          odometer: document.getElementById('jc-veh-odo').value,
          engineNo: document.getElementById('jc-veh-engine').value.trim(),
          chassisNo: document.getElementById('jc-veh-chassis').value.trim()
        },
        jobCard: {
          serviceType: document.getElementById('jc-service-type').value,
          serviceAdvisor: document.getElementById('jc-advisor').value.trim(),
          priority: priority,
          estimatedDelivery: document.getElementById('jc-est-delivery').value
        },
        complaints: {
          types: this._getComplaintTypes(),
          description: document.getElementById('jc-complaint-text').value.trim(),
          customerNotes: document.getElementById('jc-customer-notes').value.trim(),
          photos: photos
        },
        inspection: this._getInspectionData()
      };

      var result = await SHEETS.createJobCard(data);
      hideLoading();
      showToast('Job Card ' + result.jobCardNumber + ' created!', 'success');

      // Reset wizard
      this._resetWizard();
      showPage('home', 'Garage Manager');
    } catch (err) {
      hideLoading();
      showToast('Error: ' + err.message, 'error');
    }
  },

  _resetWizard: function() {
    this.currentStep = 1;
    this.selectedCustomerID = '';
    this.selectedVehicleID = '';

    // Reset all form fields
    ['jc-phone','jc-name','jc-alt-phone','jc-email','jc-address','jc-city',
     'jc-veh-number','jc-veh-brand','jc-veh-model','jc-veh-variant','jc-veh-color','jc-veh-year','jc-veh-odo','jc-veh-engine','jc-veh-chassis',
     'jc-advisor','jc-est-delivery','jc-complaint-text','jc-customer-notes'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });

    document.querySelectorAll('.complaint-chips input').forEach(function(cb) { cb.checked = false; });
    document.getElementById('customer-lookup-result').innerHTML = '';
    document.getElementById('vehicle-selection').style.display = 'none';
    document.getElementById('customer-fields').style.display = '';
    document.getElementById('vehicle-fields').style.display = '';
    document.getElementById('inspection-grid').innerHTML = '';
    document.getElementById('complaint-thumbnails').innerHTML = '';
    document.getElementById('preview-complaint-photos').innerHTML = '<span class="upload-icon"><i data-lucide="camera"></i></span><span>Capture damage photos</span>';
    renderIcons();

    // Reset wizard progress
    this.goStep(1);
  }
};
