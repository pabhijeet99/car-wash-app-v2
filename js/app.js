// =============================================
// CAR WASH MANAGER — App Logic
// APK-friendly: No external libraries
// =============================================

// =============================================
// GLOBAL UTILITIES
// =============================================
let _toastTimer = null;

function showToast(msg, type) {
  type = type || 'success';
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text || 'Please wait...';
  document.getElementById('loading').removeAttribute('hidden');
}

function hideLoading() {
  document.getElementById('loading').setAttribute('hidden', '');
}

function showScreen(name) {
  document.getElementById('screen-setup').hidden = (name !== 'setup');
  document.getElementById('screen-login').hidden = (name !== 'login');
  document.getElementById('app').hidden           = (name !== 'app');
}

// =============================================
// SETUP WIZARD NAVIGATION
// =============================================
const TOTAL_SETUP_STEPS = 8;

function goSetupStep(step) {
  document.querySelectorAll('.setup-step').forEach(el => el.hidden = true);
  document.getElementById('setup-step-' + step).hidden = false;
  updateProgressIndicator(step);
  // Scroll auth-card to top
  var card = document.querySelector('.auth-card');
  if (card) card.scrollTop = 0;
}

function updateProgressIndicator(currentStep) {
  document.querySelectorAll('.progress-step').forEach(function(el) {
    var s = parseInt(el.getAttribute('data-step'));
    el.classList.remove('active', 'done');
    if (s === currentStep) {
      el.classList.add('active');
    } else if (s < currentStep) {
      el.classList.add('done');
    }
  });
}

// =============================================
// FILE UPLOAD HELPERS
// =============================================
// Store file data for upload during registration
var _onboardingFiles = {};

function setupFileInput(inputId, previewId, areaId, allowMultiple) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', function() {
    var previewEl = document.getElementById(previewId);
    var areaEl = areaId ? document.getElementById(areaId) : input.closest('.file-upload-area');

    if (allowMultiple && input.files.length > 0) {
      // Multiple files (garage photos)
      var files = Array.from(input.files).slice(0, 5);
      _onboardingFiles[inputId] = files;
      var thumbContainer = document.getElementById('garage-thumbnails');
      thumbContainer.innerHTML = '';
      files.forEach(function(f) {
        var img = document.createElement('img');
        img.className = 'photo-thumb';
        img.src = URL.createObjectURL(f);
        thumbContainer.appendChild(img);
      });
      previewEl.innerHTML = '<span class="upload-filename">&#10003; ' + files.length + ' photo(s) selected</span>';
      if (areaEl) areaEl.classList.add('has-file');
    } else if (input.files.length > 0) {
      var file = input.files[0];
      _onboardingFiles[inputId] = file;
      if (file.type.startsWith('image/')) {
        previewEl.innerHTML = '<img class="upload-preview-img" src="' + URL.createObjectURL(file) + '" alt="preview" />' +
          '<span class="upload-filename">&#10003; ' + esc(file.name) + '</span>';
      } else {
        previewEl.innerHTML = '<span class="upload-filename">&#10003; ' + esc(file.name) + '</span>';
      }
      if (areaEl) areaEl.classList.add('has-file');
    }
  });
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Initialize file inputs after DOM loads
document.addEventListener('DOMContentLoaded', function() {
  setupFileInput('file-aadhaar', 'preview-aadhaar', 'upload-aadhaar', false);
  setupFileInput('file-pan', 'preview-pan', 'upload-pan', false);
  setupFileInput('file-gst', 'preview-gst', null, false);
  setupFileInput('file-cheque', 'preview-cheque', null, false);
  setupFileInput('file-garage', 'preview-garage', null, true);
  setupFileInput('file-agreement', 'preview-agreement', null, false);
});

// =============================================
// VALIDATION HELPERS
// =============================================
function validateAadhaar(val) {
  return /^\d{12}$/.test(val);
}

function validatePAN(val) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.toUpperCase());
}

function validateIFSC(val) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase());
}

function validateAccountNumber(val) {
  return /^\d{9,18}$/.test(val);
}

// Setup Step 1: Business Info
document.getElementById('setup-form-1').addEventListener('submit', function(e) {
  e.preventDefault();
  var business = document.getElementById('s-business').value.trim();
  var owner    = document.getElementById('s-owner').value.trim();
  var phone    = document.getElementById('s-phone').value.trim();

  if (phone && !/^\d{10}$/.test(phone)) {
    showToast('Enter a valid 10-digit mobile number', 'error');
    return;
  }

  AUTH.saveProfile({ businessName: business, ownerName: owner, phone });
  goSetupStep(2);
});

// Setup Step 2: Email
document.getElementById('setup-form-2').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('s-email').value.trim();

  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.email = email;
  AUTH.saveProfile(profile);
  goSetupStep(3);
});

// Setup Step 3: Identity Proof
document.getElementById('setup-form-3').addEventListener('submit', function(e) {
  e.preventDefault();
  var aadhaar = document.getElementById('s-aadhaar').value.trim();
  var pan     = document.getElementById('s-pan').value.trim().toUpperCase();
  var dl      = document.getElementById('s-dl').value.trim();

  if (!validateAadhaar(aadhaar)) {
    showToast('Aadhaar must be exactly 12 digits', 'error');
    return;
  }
  if (!validatePAN(pan)) {
    showToast('PAN must be in format ABCDE1234F', 'error');
    return;
  }
  if (!_onboardingFiles['file-aadhaar']) {
    showToast('Please upload Aadhaar photo', 'error');
    return;
  }
  if (!_onboardingFiles['file-pan']) {
    showToast('Please upload PAN photo', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.aadhaar = aadhaar;
  profile.pan = pan;
  profile.dl = dl;
  AUTH.saveProfile(profile);
  goSetupStep(4);
});

// Setup Step 4: Business Proof
document.getElementById('setup-form-4').addEventListener('submit', function(e) {
  e.preventDefault();
  var gst         = document.getElementById('s-gst').value.trim().toUpperCase();
  var licType     = document.getElementById('s-license-type').value;
  var licNumber   = document.getElementById('s-license-number').value.trim();

  if (gst && (gst.length !== 15)) {
    showToast('GST number must be 15 characters', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.gst = gst;
  profile.licenseType = licType;
  profile.licenseNumber = licNumber;
  AUTH.saveProfile(profile);
  goSetupStep(5);
});

// Setup Step 5: Bank Details
document.getElementById('setup-form-5').addEventListener('submit', function(e) {
  e.preventDefault();
  var accHolder = document.getElementById('s-acc-holder').value.trim();
  var bankName  = document.getElementById('s-bank-name').value.trim();
  var accNumber = document.getElementById('s-acc-number').value.trim();
  var accConfirm = document.getElementById('s-acc-number-confirm').value.trim();
  var ifsc      = document.getElementById('s-ifsc').value.trim().toUpperCase();

  if (!validateAccountNumber(accNumber)) {
    showToast('Account number must be 9-18 digits', 'error');
    return;
  }
  if (accNumber !== accConfirm) {
    showToast('Account numbers do not match', 'error');
    return;
  }
  if (!validateIFSC(ifsc)) {
    showToast('Invalid IFSC code (e.g. SBIN0001234)', 'error');
    return;
  }
  if (!_onboardingFiles['file-cheque']) {
    showToast('Please upload cancelled cheque photo', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.accHolder = accHolder;
  profile.bankName = bankName;
  profile.accNumber = accNumber;
  profile.ifsc = ifsc;
  AUTH.saveProfile(profile);
  goSetupStep(6);
});

// Setup Step 6: Garage Details
document.getElementById('setup-form-6').addEventListener('submit', function(e) {
  e.preventDefault();
  var garageName    = document.getElementById('s-garage-name').value.trim();
  var garageAddress = document.getElementById('s-garage-address').value.trim();
  var garagePhone   = document.getElementById('s-garage-phone').value.trim();
  var experience    = document.getElementById('s-experience').value.trim();

  if (garagePhone && !/^\d{10}$/.test(garagePhone)) {
    showToast('Enter a valid 10-digit contact number', 'error');
    return;
  }
  if (!_onboardingFiles['file-garage'] || _onboardingFiles['file-garage'].length === 0) {
    showToast('Please upload at least 1 garage photo', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.garageName = garageName;
  profile.garageAddress = garageAddress;
  profile.garagePhone = garagePhone;
  profile.experience = experience;
  AUTH.saveProfile(profile);
  goSetupStep(7);
});

// Setup Step 7: Vendor Agreement
document.getElementById('setup-form-7').addEventListener('submit', function(e) {
  e.preventDefault();
  var agreed = document.getElementById('s-agreement-check').checked;

  if (!agreed) {
    showToast('You must agree to the Vendor Agreement', 'error');
    return;
  }

  var profile = AUTH.getProfile() || {};
  profile.agreementAccepted = true;
  profile.agreementDate = new Date().toISOString();
  AUTH.saveProfile(profile);

  // Move to PIN step
  PINUI.setupPhase    = 'set';
  PINUI.setupFirstPin = '';
  PINUI.clearDots('setup');
  document.getElementById('setup-pin-hint').textContent = 'Enter a 4-digit PIN';
  goSetupStep(8);
});

// Auto-uppercase PAN input
var panInput = document.getElementById('s-pan');
if (panInput) {
  panInput.addEventListener('input', function() {
    var pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
  });
}

// Auto-uppercase IFSC input
var ifscInput = document.getElementById('s-ifsc');
if (ifscInput) {
  ifscInput.addEventListener('input', function() {
    var pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
  });
}

// Auto-uppercase GST input
var gstInput = document.getElementById('s-gst');
if (gstInput) {
  gstInput.addEventListener('input', function() {
    var pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
  });
}

// =============================================
// NAVIGATION
// =============================================
let currentPage = 'home';
let searchType  = 'phone';

function showPage(pageName, title) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('page-' + pageName).classList.add('active');
  const navBtn = document.getElementById('nav-' + pageName);
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('header-text').textContent = title || 'Car Wash Manager';

  const backBtn = document.getElementById('back-btn');
  if (pageName === 'home') {
    backBtn.classList.remove('visible');
  } else {
    backBtn.classList.add('visible');
  }

  currentPage = pageName;
  document.querySelector('.app-main').scrollTop = 0;

  // Populate settings when opening
  if (pageName === 'settings') populateSettings();
}

function goBack() {
  showPage('home', 'Car Wash Manager');
}

// =============================================
// MAIN APP CONTROLLER
// =============================================
const APP = {
  start(profile) {
    if (!profile) profile = { businessName: 'Car Wash Manager', ownerName: '' };

    document.getElementById('business-name-display').textContent = profile.businessName;
    document.getElementById('user-greeting').textContent = 'Welcome, ' + (profile.ownerName || 'Owner') + '! 👋';
    document.getElementById('strip-info').textContent    = profile.businessName;

    showScreen('app');
    showPage('home', 'Car Wash Manager');
  }
};

// =============================================
// SETTINGS PAGE
// =============================================
function populateSettings() {
  const profile = AUTH.getProfile() || {};
  document.getElementById('set-business').value = profile.businessName || '';
  document.getElementById('set-owner').value    = profile.ownerName    || '';
  document.getElementById('set-phone').value    = profile.phone        || '';
  document.getElementById('set-email').value    = profile.email        || '';
}

function saveSettings() {
  const business = document.getElementById('set-business').value.trim();
  const owner    = document.getElementById('set-owner').value.trim();
  const phone    = document.getElementById('set-phone').value.trim();
  const email    = document.getElementById('set-email').value.trim();

  if (!business) { showToast('Business name is required', 'error'); return; }

  const profile = AUTH.getProfile() || {};
  AUTH.saveProfile({ ...profile, businessName: business, ownerName: owner, phone, email });

  document.getElementById('business-name-display').textContent = business;
  document.getElementById('strip-info').textContent            = business;

  showToast('✅ Settings saved!', 'success');
}

function changePin() {
  // Reset PIN setup
  PINUI.setupPhase    = 'set';
  PINUI.setupFirstPin = '';
  PINUI.clearDots('setup');
  document.getElementById('setup-pin-hint').textContent = 'Enter your new 4-digit PIN';
  // Hide progress indicator when changing PIN
  var progress = document.getElementById('setup-progress');
  if (progress) progress.style.display = 'none';
  goSetupStep(8);
  showScreen('setup');
}

// =============================================
// SEARCH TYPE TOGGLE
// =============================================
function setSearchType(type, btn) {
  searchType = type;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const input = document.getElementById('searchQuery');
  input.value = '';
  document.getElementById('search-results').innerHTML = '';

  if (type === 'phone') {
    input.type        = 'tel';
    input.placeholder = 'Enter phone number...';
    input.maxLength   = 10;
  } else {
    input.type        = 'text';
    input.placeholder = 'Enter vehicle number (e.g. KA01AB1234)';
    input.maxLength   = 15;
  }
}

// =============================================
// NEW ENTRY FORM
// =============================================
document.getElementById('entry-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const phone = document.getElementById('phone').value.trim();
  if (!/^\d{10}$/.test(phone)) {
    showToast('Please enter a valid 10-digit phone number', 'error');
    return;
  }

  const submitBtn  = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  submitBtn.disabled = true;
  submitText.textContent = '⏳ Saving...';
  showLoading('Saving to Google Sheet...');

  const record = {
    customerName:  document.getElementById('customerName').value.trim(),
    phone,
    vehicleNumber: document.getElementById('vehicleNumber').value.trim().toUpperCase(),
    vehicleModel:  document.getElementById('vehicleModel').value.trim(),
    serviceType:   document.getElementById('serviceType').value,
    amount:        document.getElementById('amount').value,
    staffName:     document.getElementById('staffName').value.trim(),
    notes:         document.getElementById('notes').value.trim()
  };

  try {
    await SHEETS.addRecord(record);
    hideLoading();
    showToast('✅ Entry saved to Google Sheet!', 'success');
    e.target.reset();
    showPage('home', 'Car Wash Manager');
  } catch (err) {
    hideLoading();
    showToast('❌ ' + err.message, 'error');
    console.error('Save error:', err);
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = '💾 Save Entry';
  }
});

// =============================================
// SEARCH
// =============================================
async function doSearch() {
  const query = document.getElementById('searchQuery').value.trim();
  if (!query) { showToast('Please enter a search term', 'error'); return; }

  if (searchType === 'phone' && !/^\d{7,10}$/.test(query)) {
    showToast('Enter at least 7 digits of phone number', 'error');
    return;
  }

  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 14px"></div>Searching...</div>';

  try {
    const results = await SHEETS.search(query, searchType);
    if (results.length === 0) {
      resultsDiv.innerHTML = buildNoResults('No records found for "' + query + '"');
      return;
    }
    results.sort((a, b) => _parseDate(b.date) - _parseDate(a.date));
    renderResults(results, resultsDiv);
  } catch (err) {
    resultsDiv.innerHTML = buildNoResults('Error: ' + err.message);
  }
}

document.getElementById('searchQuery').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') doSearch();
});

// =============================================
// RENDER RESULTS
// =============================================
function renderResults(visits, container) {
  const first       = visits[0];
  const totalAmount = visits.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
  const vehicles    = [...new Set(visits.map(v => v.vehicleNumber).filter(Boolean))];

  let html = `
    <div class="customer-summary-card">
      <h3>👤 ${esc(first.customerName)}</h3>
      <div class="customer-meta">
        <span>📱 ${esc(first.phone)}</span>
        <span class="visit-badge">${visits.length} Visit${visits.length !== 1 ? 's' : ''}</span>
      </div>
      ${vehicles.length ? `<div class="customer-meta" style="margin-top:8px">${vehicles.map(v => `<span>🚗 ${esc(v)}</span>`).join('')}</div>` : ''}
      <div class="customer-meta" style="margin-top:8px">
        <span>💰 Total Spent: ₹${totalAmount.toLocaleString('en-IN')}</span>
      </div>
    </div>
    <div class="section-label">Visit History (${visits.length})</div>`;

  visits.forEach(v => {
    html += `
      <div class="visit-card">
        <div class="visit-top-row">
          <span class="visit-date">📅 ${esc(v.date)}</span>
          <span class="visit-amount">₹${esc(v.amount)}</span>
        </div>
        ${v.vehicleNumber ? `<div class="visit-info-row"><span class="info-icon">🚗</span><span>${esc(v.vehicleNumber)}${v.vehicleModel ? ` (${esc(v.vehicleModel)})` : ''}</span></div>` : ''}
        ${v.serviceType   ? `<div class="visit-info-row"><span class="info-icon">🧹</span><span>${esc(v.serviceType)}</span></div>` : ''}
        ${v.staffName     ? `<div class="visit-info-row"><span class="info-icon">👷</span><span>${esc(v.staffName)}</span></div>` : ''}
        ${v.notes         ? `<div class="visit-notes">📝 ${esc(v.notes)}</div>` : ''}
      </div>`;
  });

  container.innerHTML = html;
}

function buildNoResults(msg) {
  return `<div class="no-results"><div class="no-results-icon">🔍</div><p>${esc(msg)}</p></div>`;
}

// =============================================
// UTILITIES
// =============================================
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _parseDate(str) {
  if (!str) return 0;
  const m = str.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
  return new Date(str).getTime() || 0;
}

// Auto-uppercase vehicle number
document.getElementById('vehicleNumber').addEventListener('input', function() {
  const pos = this.selectionStart;
  this.value = this.value.toUpperCase();
  this.setSelectionRange(pos, pos);
});

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
