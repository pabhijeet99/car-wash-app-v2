// =============================================
// CAR WASH MANAGER — Google Sheets API
// Uses one master Apps Script URL.
// Each client gets their own Sheet ID on register.
// =============================================

// =============================================
// DEVELOPER: Paste your Master Script URL here
//    (Deploy Code.gs ONCE — all clients use this)
// =============================================
const MASTER_URL = 'https://script.google.com/macros/s/AKfycbw-QRclj3P9Royugt-HLufksXHYLfG41VBsQBg5USUdo9UwidFAmlcQ7hFAjQdtgOo9/exec';

// =============================================
const SHEETS = {

  getMasterUrl() {
    return MASTER_URL;
  },

  getSheetId() {
    return localStorage.getItem('cw_sheet_id') || '';
  },

  saveSheetId(id) {
    localStorage.setItem('cw_sheet_id', id);
  },

  // Helper: Call Google Apps Script (handles redirects + CORS)
  async _callScript(params) {
    const url = this.getMasterUrl();
    if (!url || url === 'YOUR_MASTER_SCRIPT_URL_HERE') {
      throw new Error('Master script URL not configured.');
    }

    try {
      const fullUrl = url + '?' + params.toString();
      const res = await fetch(fullUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const text = await res.text();

      // Try to parse JSON directly
      try {
        return JSON.parse(text);
      } catch (e) {
        // Google Apps Script sometimes wraps JSON in HTML after redirect
        var match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned invalid response');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        throw new Error(
          'Cannot connect to server. Check:\n' +
          '1. Your internet connection\n' +
          '2. Apps Script deployed with "Who has access: Anyone"\n' +
          '3. Try re-deploying as a NEW deployment'
        );
      }
      throw err;
    }
  },

  // Helper: POST to Google Apps Script (for file uploads)
  async _postScript(bodyParams) {
    const url = this.getMasterUrl();
    if (!url || url === 'YOUR_MASTER_SCRIPT_URL_HERE') {
      throw new Error('App not configured.');
    }

    try {
      // Use text/plain to avoid CORS preflight with Apps Script
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyParams),
        redirect: 'follow'
      });

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        var match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        console.error('Non-JSON POST response:', text.substring(0, 200));
        throw new Error('Server returned invalid response');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        throw new Error('Upload failed - cannot connect to server');
      }
      throw err;
    }
  },

  // ---- REGISTER: Auto-creates Google Sheet for new client ----
  async register(profile) {
    const params = new URLSearchParams({
      action:           'register',
      businessName:     profile.businessName    || '',
      ownerName:        profile.ownerName       || '',
      email:            profile.email           || '',
      phone:            profile.phone           || '',
      aadhaar:          profile.aadhaar         || '',
      pan:              profile.pan             || '',
      dl:               profile.dl              || '',
      gst:              profile.gst             || '',
      licenseType:      profile.licenseType     || '',
      licenseNumber:    profile.licenseNumber   || '',
      accHolder:        profile.accHolder       || '',
      bankName:         profile.bankName        || '',
      accNumber:        profile.accNumber       || '',
      ifsc:             profile.ifsc            || '',
      garageName:       profile.garageName      || '',
      garageAddress:    profile.garageAddress   || '',
      garagePhone:      profile.garagePhone     || '',
      experience:       profile.experience      || '',
      agreementAccepted: profile.agreementAccepted ? 'Yes' : 'No',
      agreementDate:    profile.agreementDate   || ''
    });

    const data = await this._callScript(params);

    if (!data.success) throw new Error(data.error || 'Registration failed');

    this.saveSheetId(data.sheetId);
    return data;
  },

  // ---- UPLOAD DOCUMENT: Upload a file (base64) to Google Drive via Apps Script ----
  async uploadDocument(sheetId, docType, fileName, base64Data) {
    const data = await this._postScript({
      action:   'uploadFile',
      sheetId:  sheetId,
      docType:  docType,
      fileName: fileName,
      fileData: base64Data
    });

    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data;
  },

  // ---- ADD a new visit record ----
  async addRecord(record) {
    const sheetId = this.getSheetId();
    if (!sheetId) {
      throw new Error('No sheet linked. Please re-register the app.');
    }

    const params = new URLSearchParams({
      action:        'add',
      sheetId,
      customerName:  record.customerName  || '',
      phone:         record.phone         || '',
      vehicleNumber: (record.vehicleNumber || '').toUpperCase(),
      vehicleModel:  record.vehicleModel  || '',
      serviceType:   record.serviceType   || '',
      amount:        record.amount        || '',
      staffName:     record.staffName     || '',
      notes:         record.notes         || ''
    });

    const data = await this._callScript(params);

    if (!data.success) throw new Error(data.error || 'Failed to save record');
    return data;
  },

  // ---- SEARCH records ----
  async search(query, type) {
    const sheetId = this.getSheetId();
    if (!sheetId) {
      throw new Error('No sheet linked. Please re-register the app.');
    }

    const params = new URLSearchParams({
      action: 'search',
      sheetId,
      query:  query.trim(),
      type
    });

    const data = await this._callScript(params);

    if (data.error) throw new Error(data.error);
    return Array.isArray(data) ? data : [];
  }
};
