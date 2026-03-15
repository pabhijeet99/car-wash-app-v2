// =============================================
// GARAGE MANAGER - Core App Logic
// Navigation, utilities, setup wizard, dashboard
// =============================================

// =============================================
// GLOBAL UTILITIES
// =============================================
var _toastTimer = null;

function showToast(msg, type) {
  type = type || 'success';
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = 'toast'; }, 3500);
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
  document.getElementById('app').hidden = (name !== 'app');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================
// NAVIGATION STACK
// =============================================
var currentPage = 'home';
var currentTitle = 'Garage Manager';
var navStack = [];

function showPage(pageName, title, pushToStack) {
  if (pushToStack === undefined) pushToStack = true;
  if (pushToStack && currentPage !== pageName) {
    navStack.push({ page: currentPage, title: currentTitle });
  }

  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });

  var pageEl = document.getElementById('page-' + pageName);
  if (pageEl) pageEl.classList.add('active');

  var navBtn = document.getElementById('nav-' + pageName);
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('header-text').textContent = title || 'Garage Manager';

  var backBtn = document.getElementById('back-btn');
  if (pageName === 'home') {
    backBtn.classList.remove('visible');
    navStack = []; // Reset stack when going home
  } else {
    backBtn.classList.add('visible');
  }

  currentPage = pageName;
  currentTitle = title || 'Garage Manager';
  document.querySelector('.app-main').scrollTop = 0;

  if (pageName === 'settings') populateSettings();
  if (pageName === 'home') loadDashboard();
}

function goBack() {
  if (navStack.length > 0) {
    var prev = navStack.pop();
    showPage(prev.page, prev.title, false);
  } else {
    showPage('home', 'Garage Manager', false);
  }
}

// =============================================
// SETUP WIZARD NAVIGATION
// =============================================
var TOTAL_SETUP_STEPS = 8;

function goSetupStep(step) {
  document.querySelectorAll('.setup-step').forEach(function(el) { el.hidden = true; });
  document.getElementById('setup-step-' + step).hidden = false;
  updateProgressIndicator(step);
  var card = document.querySelector('.auth-card');
  if (card) card.scrollTop = 0;
}

function updateProgressIndicator(currentStep) {
  document.querySelectorAll('.progress-step').forEach(function(el) {
    var s = parseInt(el.getAttribute('data-step'));
    el.classList.remove('active', 'done');
    if (s === currentStep) el.classList.add('active');
    else if (s < currentStep) el.classList.add('done');
  });
}

// =============================================
// FILE UPLOAD HELPERS
// =============================================
var _onboardingFiles = {};

function setupFileInput(inputId, previewId, areaId, allowMultiple) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', function() {
    var previewEl = document.getElementById(previewId);
    var areaEl = areaId ? document.getElementById(areaId) : input.closest('.file-upload-area');
    if (allowMultiple && input.files.length > 0) {
      var files = Array.from(input.files).slice(0, 5);
      _onboardingFiles[inputId] = files;
      var thumbContainer = document.getElementById(areaId === 'upload-aadhaar' ? 'garage-thumbnails' : (inputId === 'file-garage' ? 'garage-thumbnails' : 'complaint-thumbnails'));
      if (thumbContainer) {
        thumbContainer.innerHTML = '';
        files.forEach(function(f) {
          var img = document.createElement('img');
          img.className = 'photo-thumb';
          img.src = URL.createObjectURL(f);
          thumbContainer.appendChild(img);
        });
      }
      previewEl.innerHTML = '<span class="upload-filename">&#10003; ' + files.length + ' photo(s) selected</span>';
      if (areaEl) areaEl.classList.add('has-file');
    } else if (input.files.length > 0) {
      var file = input.files[0];
      _onboardingFiles[inputId] = file;
      if (file.type.startsWith('image/')) {
        previewEl.innerHTML = '<img class="upload-preview-img" src="' + URL.createObjectURL(file) + '" alt="preview" /><span class="upload-filename">&#10003; ' + esc(file.name) + '</span>';
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

document.addEventListener('DOMContentLoaded', function() {
  setupFileInput('file-aadhaar', 'preview-aadhaar', 'upload-aadhaar', false);
  setupFileInput('file-pan', 'preview-pan', 'upload-pan', false);
  setupFileInput('file-gst', 'preview-gst', null, false);
  setupFileInput('file-cheque', 'preview-cheque', null, false);
  setupFileInput('file-garage', 'preview-garage', null, true);
  setupFileInput('file-agreement', 'preview-agreement', null, false);
  setupFileInput('jc-complaint-photos', 'preview-complaint-photos', null, true);
});

// =============================================
// VALIDATION HELPERS
// =============================================
function validateAadhaar(val) { return /^\d{12}$/.test(val); }
function validatePAN(val) { return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.toUpperCase()); }
function validateIFSC(val) { return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase()); }
function validateAccountNumber(val) { return /^\d{9,18}$/.test(val); }

// =============================================
// SETUP FORM HANDLERS (Steps 1-7)
// =============================================
document.getElementById('setup-form-1').addEventListener('submit', function(e) {
  e.preventDefault();
  var business = document.getElementById('s-business').value.trim();
  var owner = document.getElementById('s-owner').value.trim();
  var phone = document.getElementById('s-phone').value.trim();
  if (phone && !/^\d{10}$/.test(phone)) { showToast('Enter valid 10-digit number', 'error'); return; }
  AUTH.saveProfile({ businessName: business, ownerName: owner, phone: phone });
  goSetupStep(2);
});

document.getElementById('setup-form-2').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('s-email').value.trim();
  if (!email || !email.includes('@')) { showToast('Enter valid email', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.email = email;
  AUTH.saveProfile(profile);
  goSetupStep(3);
});

document.getElementById('setup-form-3').addEventListener('submit', function(e) {
  e.preventDefault();
  var aadhaar = document.getElementById('s-aadhaar').value.trim();
  var pan = document.getElementById('s-pan').value.trim().toUpperCase();
  if (!validateAadhaar(aadhaar)) { showToast('Aadhaar must be 12 digits', 'error'); return; }
  if (!validatePAN(pan)) { showToast('PAN format: ABCDE1234F', 'error'); return; }
  if (!_onboardingFiles['file-aadhaar']) { showToast('Upload Aadhaar photo', 'error'); return; }
  if (!_onboardingFiles['file-pan']) { showToast('Upload PAN photo', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.aadhaar = aadhaar; profile.pan = pan; profile.dl = document.getElementById('s-dl').value.trim();
  AUTH.saveProfile(profile);
  goSetupStep(4);
});

document.getElementById('setup-form-4').addEventListener('submit', function(e) {
  e.preventDefault();
  var gst = document.getElementById('s-gst').value.trim().toUpperCase();
  if (gst && gst.length !== 15) { showToast('GST must be 15 characters', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.gst = gst;
  profile.licenseType = document.getElementById('s-license-type').value;
  profile.licenseNumber = document.getElementById('s-license-number').value.trim();
  AUTH.saveProfile(profile);
  goSetupStep(5);
});

document.getElementById('setup-form-5').addEventListener('submit', function(e) {
  e.preventDefault();
  var accNumber = document.getElementById('s-acc-number').value.trim();
  var accConfirm = document.getElementById('s-acc-number-confirm').value.trim();
  var ifsc = document.getElementById('s-ifsc').value.trim().toUpperCase();
  if (!validateAccountNumber(accNumber)) { showToast('Account: 9-18 digits', 'error'); return; }
  if (accNumber !== accConfirm) { showToast('Account numbers don\'t match', 'error'); return; }
  if (!validateIFSC(ifsc)) { showToast('Invalid IFSC', 'error'); return; }
  if (!_onboardingFiles['file-cheque']) { showToast('Upload cheque photo', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.accHolder = document.getElementById('s-acc-holder').value.trim();
  profile.bankName = document.getElementById('s-bank-name').value.trim();
  profile.accNumber = accNumber; profile.ifsc = ifsc;
  AUTH.saveProfile(profile);
  goSetupStep(6);
});

document.getElementById('setup-form-6').addEventListener('submit', function(e) {
  e.preventDefault();
  var garagePhone = document.getElementById('s-garage-phone').value.trim();
  if (garagePhone && !/^\d{10}$/.test(garagePhone)) { showToast('Enter valid 10-digit number', 'error'); return; }
  if (!_onboardingFiles['file-garage'] || _onboardingFiles['file-garage'].length === 0) { showToast('Upload at least 1 garage photo', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.garageName = document.getElementById('s-garage-name').value.trim();
  profile.garageAddress = document.getElementById('s-garage-address').value.trim();
  profile.garagePhone = garagePhone;
  profile.experience = document.getElementById('s-experience').value.trim();
  AUTH.saveProfile(profile);
  goSetupStep(7);
});

document.getElementById('setup-form-7').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!document.getElementById('s-agreement-check').checked) { showToast('Accept the agreement', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  profile.agreementAccepted = true;
  profile.agreementDate = new Date().toISOString();
  AUTH.saveProfile(profile);
  PINUI.setupPhase = 'set'; PINUI.setupFirstPin = '';
  PINUI.clearDots('setup');
  document.getElementById('setup-pin-hint').textContent = 'Enter a 4-digit PIN';
  goSetupStep(8);
});

// Auto-uppercase inputs
['s-pan', 's-ifsc', 's-gst'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('input', function() { var p = this.selectionStart; this.value = this.value.toUpperCase(); this.setSelectionRange(p, p); });
});

// =============================================
// MAIN APP CONTROLLER
// =============================================
var APP = {
  start: function(profile) {
    if (!profile) profile = { businessName: 'Garage Manager', ownerName: '' };
    document.getElementById('business-name-display').textContent = profile.businessName;
    document.getElementById('user-greeting').textContent = 'Welcome, ' + (profile.ownerName || 'Owner') + '!';
    document.getElementById('strip-info').textContent = profile.businessName;
    showScreen('app');
    showPage('home', 'Garage Manager', false);
  }
};

// =============================================
// DASHBOARD
// =============================================
function loadDashboard() {
  if (!SHEETS.getSheetId()) return;
  SHEETS.getDashboardStats().then(function(stats) {
    document.getElementById('stat-today').textContent = stats.todayJobs || 0;
    document.getElementById('stat-open').textContent = stats.openJobs || 0;
    document.getElementById('stat-pending').textContent = stats.pendingDelivery || 0;
    document.getElementById('stat-revenue').textContent = '\u20B9' + (stats.todayRevenue || 0).toLocaleString('en-IN');
  }).catch(function() {});
}

// =============================================
// SEARCH
// =============================================
var searchType = 'phone';

function setSearchType(type, btn) {
  searchType = type;
  document.querySelectorAll('.search-toggle .toggle-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var input = document.getElementById('searchQuery');
  input.value = '';
  document.getElementById('search-results').innerHTML = '';
  if (type === 'phone') { input.type = 'tel'; input.placeholder = 'Enter phone number...'; input.maxLength = 10; }
  else if (type === 'vehicle') { input.type = 'text'; input.placeholder = 'Vehicle number (KA01AB1234)'; input.maxLength = 15; }
  else { input.type = 'text'; input.placeholder = 'Job card number (JC-...)'; input.maxLength = 20; }
}

async function doSearch() {
  var query = document.getElementById('searchQuery').value.trim();
  if (!query) { showToast('Enter a search term', 'error'); return; }
  var resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<div class="inline-loading"><div class="spinner" style="margin:0 auto 14px"></div>Searching...</div>';
  try {
    var results = await SHEETS.search(query, searchType);
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="no-results"><div class="no-results-icon">🔍</div><p>No records found</p></div>';
      return;
    }
    renderSearchResults(results, resultsDiv);
  } catch (err) {
    resultsDiv.innerHTML = '<div class="no-results"><p>' + esc(err.message) + '</p></div>';
  }
}

function renderSearchResults(results, container) {
  var html = '';
  results.forEach(function(r) {
    if (r.jobCardNumber) {
      var statusClass = 'status-' + (r.status || 'open').toString().toLowerCase();
      html += '<div class="job-card-item" onclick="JOBLIST.openDetail(\'' + esc(r.jobCardNumber) + '\')">' +
        '<div class="jc-top"><span class="jc-number">' + esc(r.jobCardNumber) + '</span><span class="status-badge ' + statusClass + '">' + esc(r.status) + '</span></div>' +
        '<div class="jc-info">👤 ' + esc(r.customerName) + ' &bull; 🚗 ' + esc(r.vehicleNumber) + '</div>' +
        '<div class="jc-info">🔧 ' + esc(r.serviceType) + ' &bull; ' + esc(r.date) + '</div></div>';
    } else {
      html += '<div class="visit-card"><div class="visit-top-row"><span class="visit-date">' + esc(r.date) + '</span><span class="visit-amount">\u20B9' + esc(r.amount) + '</span></div>' +
        '<div class="visit-info-row"><span class="info-icon">👤</span><span>' + esc(r.customerName) + '</span></div>' +
        '<div class="visit-info-row"><span class="info-icon">🚗</span><span>' + esc(r.vehicleNumber) + ' ' + esc(r.vehicleModel) + '</span></div></div>';
    }
  });
  container.innerHTML = html;
}

document.getElementById('searchQuery').addEventListener('keypress', function(e) { if (e.key === 'Enter') doSearch(); });

// =============================================
// SETTINGS
// =============================================
function populateSettings() {
  var profile = AUTH.getProfile() || {};
  document.getElementById('set-business').value = profile.businessName || '';
  document.getElementById('set-owner').value = profile.ownerName || '';
  document.getElementById('set-phone').value = profile.phone || '';
  document.getElementById('set-email').value = profile.email || '';
}

function saveSettings() {
  var business = document.getElementById('set-business').value.trim();
  if (!business) { showToast('Business name required', 'error'); return; }
  var profile = AUTH.getProfile() || {};
  AUTH.saveProfile(Object.assign(profile, {
    businessName: business,
    ownerName: document.getElementById('set-owner').value.trim(),
    phone: document.getElementById('set-phone').value.trim(),
    email: document.getElementById('set-email').value.trim()
  }));
  document.getElementById('business-name-display').textContent = business;
  document.getElementById('strip-info').textContent = business;
  showToast('Settings saved!', 'success');
}

function changePin() {
  PINUI.setupPhase = 'set'; PINUI.setupFirstPin = '';
  PINUI.clearDots('setup');
  document.getElementById('setup-pin-hint').textContent = 'Enter your new 4-digit PIN';
  var progress = document.getElementById('setup-progress');
  if (progress) progress.style.display = 'none';
  goSetupStep(8);
  showScreen('setup');
}

function fullReset() {
  if (confirm('This will log you out completely and clear all local data. You will need to register again.\n\nAre you sure?')) {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
}

// Auto-uppercase vehicle number in search
var vehInput = document.getElementById('jc-veh-number');
if (vehInput) vehInput.addEventListener('input', function() { var p = this.selectionStart; this.value = this.value.toUpperCase(); this.setSelectionRange(p, p); });

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function() {});
}
