// =============================================
// GARAGE MANAGER - Google Sheets API
// Uses one master Apps Script URL.
// Each client gets their own Sheet ID on register.
// =============================================

const MASTER_URL = 'https://script.google.com/macros/s/AKfycbzcrf9Y8qN5HluIeYzgQnnwiqrWQAsWGOnlPnOiOj8q1EadrMltoIMVZ1vbSKZVgHGs/exec';

const SHEETS = {

  getMasterUrl() { return MASTER_URL; },
  getSheetId() { return localStorage.getItem('cw_sheet_id') || ''; },
  saveSheetId(id) { localStorage.setItem('cw_sheet_id', id); },

  // ---- Helper: GET call to Google Apps Script ----
  async _callScript(params) {
    var url = this.getMasterUrl();
    if (!url || url === 'YOUR_MASTER_SCRIPT_URL_HERE') throw new Error('Master script URL not configured.');
    try {
      var res = await fetch(url + '?' + params.toString(), { method: 'GET', redirect: 'follow' });
      var text = await res.text();
      try { return JSON.parse(text); } catch (e) {
        var match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Server returned invalid response');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))
        throw new Error('Cannot connect to server. Check internet & Apps Script deployment.');
      throw err;
    }
  },

  // ---- Helper: POST call to Google Apps Script ----
  async _postScript(bodyParams) {
    var url = this.getMasterUrl();
    if (!url || url === 'YOUR_MASTER_SCRIPT_URL_HERE') throw new Error('App not configured.');
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyParams),
        redirect: 'follow'
      });
      var text = await res.text();
      try { return JSON.parse(text); } catch (e) {
        var match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Server returned invalid response');
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))
        throw new Error('Upload failed - cannot connect to server');
      throw err;
    }
  },

  // ---- REGISTER ----
  async register(profile) {
    var params = new URLSearchParams({
      action: 'register',
      businessName: profile.businessName || '', ownerName: profile.ownerName || '',
      email: profile.email || '', phone: profile.phone || '',
      pin: profile.pin || '',
      aadhaar: profile.aadhaar || '', pan: profile.pan || '', dl: profile.dl || '',
      gst: profile.gst || '', licenseType: profile.licenseType || '', licenseNumber: profile.licenseNumber || '',
      accHolder: profile.accHolder || '', bankName: profile.bankName || '',
      accNumber: profile.accNumber || '', ifsc: profile.ifsc || '',
      garageName: profile.garageName || '', garageAddress: profile.garageAddress || '',
      garagePhone: profile.garagePhone || '', experience: profile.experience || '',
      agreementAccepted: profile.agreementAccepted ? 'Yes' : 'No',
      agreementDate: profile.agreementDate || ''
    });
    var data = await this._callScript(params);
    if (!data.success) throw new Error(data.error || 'Registration failed');
    this.saveSheetId(data.sheetId);
    return data;
  },

  // ---- UPLOAD DOCUMENT ----
  async uploadDocument(sheetId, docType, fileName, base64Data) {
    var data = await this._postScript({
      action: 'uploadFile', sheetId: sheetId,
      docType: docType, fileName: fileName, fileData: base64Data
    });
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data;
  },

  // ---- SEARCH CUSTOMER by phone (returns customer + vehicles) ----
  async searchCustomer(phone) {
    var params = new URLSearchParams({
      action: 'searchCustomer', sheetId: this.getSheetId(), phone: phone
    });
    return await this._callScript(params);
  },

  // ---- CREATE JOB CARD (batched: customer + vehicle + jobcard + inspection) ----
  async createJobCard(jobData) {
    jobData.action = 'createJobCard';
    jobData.sheetId = this.getSheetId();
    var data = await this._postScript(jobData);
    if (!data.success) throw new Error(data.error || 'Failed to create job card');
    return data;
  },

  // ---- GET JOB CARDS (with status filter) ----
  async getJobCards(status) {
    var params = new URLSearchParams({
      action: 'getJobCards', sheetId: this.getSheetId(), status: status || 'all'
    });
    return await this._callScript(params);
  },

  // ---- GET SINGLE JOB CARD DETAIL ----
  async getJobCard(jobCardNumber) {
    var params = new URLSearchParams({
      action: 'getJobCard', sheetId: this.getSheetId(), jobCardNumber: jobCardNumber
    });
    return await this._callScript(params);
  },

  // ---- UPDATE JOB CARD STATUS ----
  async updateJobCard(jobCardNumber, updates) {
    updates.action = 'updateJobCard';
    updates.sheetId = this.getSheetId();
    updates.jobCardNumber = jobCardNumber;
    var data = await this._postScript(updates);
    if (!data.success) throw new Error(data.error || 'Update failed');
    return data;
  },

  // ---- ADD WORK PERFORMED ----
  async addWork(jobCardNumber, workData) {
    workData.action = 'addWork';
    workData.sheetId = this.getSheetId();
    workData.jobCardNumber = jobCardNumber;
    var data = await this._postScript(workData);
    if (!data.success) throw new Error(data.error || 'Failed to add work');
    return data;
  },

  // ---- ADD PARTS ----
  async addParts(jobCardNumber, partsData) {
    partsData.action = 'addParts';
    partsData.sheetId = this.getSheetId();
    partsData.jobCardNumber = jobCardNumber;
    var data = await this._postScript(partsData);
    if (!data.success) throw new Error(data.error || 'Failed to add parts');
    return data;
  },

  // ---- CREATE BILLING ----
  async createBilling(jobCardNumber, billingData) {
    billingData.action = 'createBilling';
    billingData.sheetId = this.getSheetId();
    billingData.jobCardNumber = jobCardNumber;
    var data = await this._postScript(billingData);
    if (!data.success) throw new Error(data.error || 'Billing failed');
    return data;
  },

  // ---- UPDATE DELIVERY ----
  async updateDelivery(jobCardNumber, deliveryData) {
    deliveryData.action = 'updateDelivery';
    deliveryData.sheetId = this.getSheetId();
    deliveryData.jobCardNumber = jobCardNumber;
    var data = await this._postScript(deliveryData);
    if (!data.success) throw new Error(data.error || 'Delivery update failed');
    return data;
  },

  // ---- GET SERVICE HISTORY for a customer ----
  async getServiceHistory(customerID) {
    var params = new URLSearchParams({
      action: 'getServiceHistory', sheetId: this.getSheetId(), customerID: customerID
    });
    return await this._callScript(params);
  },

  // ---- SEARCH (enhanced: phone, vehicle, jobcard, customerID) ----
  async search(query, type) {
    var sheetId = this.getSheetId();
    if (!sheetId) throw new Error('No sheet linked. Please re-register the app.');
    var params = new URLSearchParams({
      action: 'search', sheetId: sheetId, query: query.trim(), type: type
    });
    var data = await this._callScript(params);
    if (data.error) throw new Error(data.error);
    return Array.isArray(data) ? data : [];
  },

  // ---- GET DASHBOARD STATS ----
  async getDashboardStats() {
    var params = new URLSearchParams({
      action: 'getDashboardStats', sheetId: this.getSheetId()
    });
    return await this._callScript(params);
  },

  // ---- LOOKUP PART by barcode (from PartsMaster) ----
  async lookupPart(barcode) {
    var params = new URLSearchParams({
      action: 'lookupPart', sheetId: this.getSheetId(), barcode: barcode
    });
    return await this._callScript(params);
  },

  // ---- Legacy: ADD RECORD to Visits tab ----
  async addRecord(record) {
    var sheetId = this.getSheetId();
    if (!sheetId) throw new Error('No sheet linked. Please re-register the app.');
    var params = new URLSearchParams({
      action: 'add', sheetId: sheetId,
      customerName: record.customerName || '', phone: record.phone || '',
      vehicleNumber: (record.vehicleNumber || '').toUpperCase(),
      vehicleModel: record.vehicleModel || '', serviceType: record.serviceType || '',
      amount: record.amount || '', staffName: record.staffName || '', notes: record.notes || ''
    });
    var data = await this._callScript(params);
    if (!data.success) throw new Error(data.error || 'Failed to save record');
    return data;
  }
};
