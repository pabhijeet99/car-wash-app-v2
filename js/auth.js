// =============================================
// GARAGE MANAGER — Authentication
// Mobile + PIN login via server-side verification
// =============================================

const AUTH = {

  isSetupDone() {
    return !!(
      localStorage.getItem('cw_pin') &&
      localStorage.getItem('cw_profile') &&
      localStorage.getItem('cw_sheet_id')
    );
  },

  isLoggedIn() {
    return sessionStorage.getItem('cw_session') === '1';
  },

  getProfile() {
    const p = localStorage.getItem('cw_profile');
    return p ? JSON.parse(p) : null;
  },

  saveProfile(profile) {
    localStorage.setItem('cw_profile', JSON.stringify(profile));
  },

  savePin(pin) {
    localStorage.setItem('cw_pin', pin);
  },

  verifyPin(pin) {
    return localStorage.getItem('cw_pin') === pin;
  },

  login() {
    sessionStorage.setItem('cw_session', '1');
  },

  logout() {
    sessionStorage.removeItem('cw_session');
    showScreen('landing');
    showToast('Logged out', 'info');
  },

  // Server-side login: mobile + PIN
  async serverLogin(mobile, pin) {
    showLoading('Logging in...');
    try {
      var params = new URLSearchParams({
        action: 'loginUser', mobile: mobile, pin: pin
      });
      var data = await SHEETS._callScript(params);
      hideLoading();
      if (data.success) {
        // Save locally for quick access
        AUTH.savePin(pin);
        AUTH.saveProfile(data.profile);
        SHEETS.saveSheetId(data.sheetId);
        AUTH.login();
        APP.start(data.profile);
        showToast('Welcome back, ' + (data.profile.ownerName || data.profile.businessName) + '!', 'success');
      } else {
        return data.error || 'Login failed';
      }
    } catch(err) {
      hideLoading();
      return err.message || 'Connection error';
    }
    return null;
  },

  // Verify identity for PIN reset
  async verifyResetIdentity() {
    var mobile = document.getElementById('reset-mobile').value.trim();
    var email = document.getElementById('reset-email').value.trim();
    var errEl = document.getElementById('reset-error');
    errEl.textContent = '';

    if (!mobile || mobile.length !== 10) { errEl.textContent = 'Enter valid 10-digit mobile'; return; }
    if (!email || email.indexOf('@') === -1) { errEl.textContent = 'Enter valid email'; return; }

    // Show new PIN fields
    document.getElementById('reset-verify-section').hidden = true;
    document.getElementById('reset-new-pin-section').hidden = false;
    errEl.textContent = '';
  },

  // Submit new PIN
  async submitResetPin() {
    var mobile = document.getElementById('reset-mobile').value.trim();
    var email = document.getElementById('reset-email').value.trim();
    var newPin = document.getElementById('reset-new-pin').value.trim();
    var confirmPin = document.getElementById('reset-confirm-pin').value.trim();
    var errEl = document.getElementById('reset-error');
    errEl.textContent = '';

    if (newPin.length !== 4) { errEl.textContent = 'PIN must be 4 digits'; return; }
    if (newPin !== confirmPin) { errEl.textContent = 'PINs do not match'; return; }

    showLoading('Resetting PIN...');
    try {
      var params = new URLSearchParams({
        action: 'resetPin', mobile: mobile, email: email, newPin: newPin
      });
      var data = await SHEETS._callScript(params);
      hideLoading();
      if (data.success) {
        showToast('PIN reset successfully! Please login.', 'success');
        // Reset form
        document.getElementById('reset-new-pin-section').hidden = true;
        document.getElementById('reset-verify-section').hidden = false;
        document.getElementById('reset-mobile').value = '';
        document.getElementById('reset-email').value = '';
        document.getElementById('reset-new-pin').value = '';
        document.getElementById('reset-confirm-pin').value = '';
        showScreen('login');
        // Pre-fill mobile
        document.getElementById('login-mobile').value = mobile;
      } else {
        errEl.textContent = data.error || 'Reset failed';
      }
    } catch(err) {
      hideLoading();
      errEl.textContent = err.message || 'Connection error';
    }
  }
};

// =============================================
// PIN UI CONTROLLER
// =============================================
const PINUI = {
  values:       { setup: '', login: '' },
  setupPhase:   'set',
  setupFirstPin: '',

  press(mode, digit) {
    if (this.values[mode].length >= 4) return;
    this.values[mode] += digit;
    this.updateDots(mode);
    if (this.values[mode].length === 4) {
      setTimeout(() => this.onComplete(mode), 200);
    }
  },

  del(mode) {
    this.values[mode] = this.values[mode].slice(0, -1);
    this.updateDots(mode);
  },

  updateDots(mode) {
    const prefix = mode === 'setup' ? 'sd' : 'ld';
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(prefix + i);
      if (dot) dot.classList.toggle('filled', i < this.values[mode].length);
    }
  },

  clearDots(mode) {
    this.values[mode] = '';
    this.updateDots(mode);
  },

  onComplete(mode) {
    if (mode === 'login') this.handleLogin();
    else this.handleSetupPin();
  },

  async handleLogin() {
    var mobile = document.getElementById('login-mobile').value.trim();
    var pin = this.values['login'];

    if (!mobile || mobile.length !== 10) {
      document.getElementById('login-pin-error').textContent = 'Enter your 10-digit mobile number first';
      this.clearDots('login');
      return;
    }

    var error = await AUTH.serverLogin(mobile, pin);
    if (error) {
      document.getElementById('login-pin-error').textContent = error;
      document.getElementById('screen-login').classList.add('shake');
      setTimeout(() => {
        document.getElementById('screen-login').classList.remove('shake');
        this.clearDots('login');
      }, 800);
      setTimeout(() => {
        document.getElementById('login-pin-error').textContent = '';
      }, 3000);
    }
  },

  handleSetupPin() {
    if (this.setupPhase === 'set') {
      this.setupFirstPin = this.values['setup'];
      this.setupPhase    = 'confirm';
      this.clearDots('setup');
      document.getElementById('setup-pin-hint').textContent = 'Confirm your PIN';
    } else {
      if (this.values['setup'] === this.setupFirstPin) {
        // PINs match — complete setup
        this._finishSetup(this.values['setup']);
      } else {
        this.setupPhase    = 'set';
        this.setupFirstPin = '';
        this.clearDots('setup');
        document.getElementById('setup-pin-hint').textContent = 'PINs did not match. Try again.';
        setTimeout(() => {
          document.getElementById('setup-pin-hint').textContent = 'Enter a 4-digit PIN';
        }, 2000);
      }
    }
  },

  async _finishSetup(pin) {
    const profile = AUTH.getProfile();

    // If this is just a PIN change (setup already done), skip registration
    if (AUTH.isSetupDone()) {
      AUTH.savePin(pin);
      AUTH.login();
      // Restore progress indicator visibility
      var progress = document.getElementById('setup-progress');
      if (progress) progress.style.display = '';
      showToast('PIN updated successfully!', 'success');
      APP.start(profile);
      return;
    }

    showLoading('Creating your account...');

    try {
      // Add PIN to profile for server-side storage
      profile.pin = pin;

      // Step 1: Register and create Google Sheet
      const result = await SHEETS.register(profile);

      // Step 2: Upload onboarding documents to Google Drive
      showLoading('Uploading documents...');
      const sheetId = SHEETS.getSheetId();
      const fileKeys = ['file-aadhaar', 'file-pan', 'file-gst', 'file-cheque', 'file-agreement'];

      for (const key of fileKeys) {
        if (_onboardingFiles[key]) {
          try {
            const b64 = await fileToBase64(_onboardingFiles[key]);
            await SHEETS.uploadDocument(sheetId, key.replace('file-', ''), _onboardingFiles[key].name, b64);
          } catch (e) {
            console.warn('Upload failed for ' + key + ':', e);
          }
        }
      }

      // Step 3: Upload garage photos (multiple)
      if (_onboardingFiles['file-garage'] && Array.isArray(_onboardingFiles['file-garage'])) {
        for (let i = 0; i < _onboardingFiles['file-garage'].length; i++) {
          try {
            const f = _onboardingFiles['file-garage'][i];
            const b64 = await fileToBase64(f);
            await SHEETS.uploadDocument(sheetId, 'garage-' + (i + 1), f.name, b64);
          } catch (e) {
            console.warn('Garage photo upload failed:', e);
          }
        }
      }

      AUTH.savePin(pin);
      AUTH.login();
      hideLoading();

      showToast('Setup complete! Your account is ready!', 'success');
      APP.start(profile);

    } catch (err) {
      hideLoading();
      this.setupPhase    = 'set';
      this.setupFirstPin = '';
      this.clearDots('setup');
      document.getElementById('setup-pin-hint').textContent = err.message;
      setTimeout(() => {
        document.getElementById('setup-pin-hint').textContent = 'Enter a 4-digit PIN';
      }, 3000);
    }
  }
};

// =============================================
// APP INIT — runs on page load
// =============================================
window.addEventListener('DOMContentLoaded', function() {
  if (!AUTH.isSetupDone()) {
    showScreen('landing');
  } else if (AUTH.isLoggedIn()) {
    APP.start(AUTH.getProfile());
  } else {
    showScreen('landing');
  }
});
