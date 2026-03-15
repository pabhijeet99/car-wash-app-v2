// =============================================
// GARAGE MANAGER - Master Google Apps Script
// Deploy this ONCE. All clients share this URL.
// Each client gets their own Google Sheet.
// =============================================

var MASTER_LOG_ID = '';

// =============================================
// MAIN REQUEST HANDLERS
// =============================================
function doGet(e) {
  var action = e.parameter.action;
  var result;
  try {
    if (action === 'register')         result = registerNewClient(e.parameter);
    else if (action === 'add')         result = addRecord(e.parameter);
    else if (action === 'search')      result = searchRecords(e.parameter);
    else if (action === 'searchCustomer') result = searchCustomer(e.parameter);
    else if (action === 'getJobCards')  result = getJobCards(e.parameter);
    else if (action === 'getJobCard')   result = getJobCard(e.parameter);
    else if (action === 'getServiceHistory') result = getServiceHistory(e.parameter);
    else if (action === 'getDashboardStats') result = getDashboardStats(e.parameter);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) { result = { error: err.toString() }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var params, result;
  try {
    if (e.postData && e.postData.type === 'text/plain') params = JSON.parse(e.postData.contents);
    else params = e.parameter;
    var action = params.action;
    if (action === 'uploadFile')        result = uploadFile(params);
    else if (action === 'createJobCard') result = createJobCard(params);
    else if (action === 'updateJobCard') result = updateJobCardFn(params);
    else if (action === 'addWork')       result = addWork(params);
    else if (action === 'addParts')      result = addParts(params);
    else if (action === 'createBilling') result = createBilling(params);
    else if (action === 'updateDelivery') result = updateDelivery(params);
    else result = { error: 'Unknown POST action: ' + action };
  } catch (err) { result = { error: err.toString() }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// =============================================
// HELPERS
// =============================================
function _now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm');
}

function _today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
}

function _getOrCreateSheet(ss, name, headers, widths) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF').setHorizontalAlignment('CENTER');
    sheet.setFrozenRows(1);
    if (widths) widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  }
  return sheet;
}

function _generateId(sheet, prefix) {
  var last = sheet.getLastRow();
  if (last <= 1) return prefix + '-001';
  var lastId = sheet.getRange(last, 1).getValue().toString();
  var num = parseInt(lastId.replace(/.*-/, '')) || 0;
  return prefix + '-' + ('000' + (num + 1)).slice(-3);
}

function _generateJobCardNumber(sheet) {
  var today = _today();
  var last = sheet.getLastRow();
  var seq = 1;
  if (last > 1) {
    var lastJC = sheet.getRange(last, 1).getValue().toString();
    if (lastJC.indexOf('JC-' + today) === 0) {
      seq = parseInt(lastJC.split('-')[2]) + 1 || 1;
    }
  }
  return 'JC-' + today + '-' + ('000' + seq).slice(-3);
}

// =============================================
// REGISTER NEW CLIENT (creates all sheets)
// =============================================
function registerNewClient(params) {
  var businessName = params.businessName || 'Garage';
  var ownerName = params.ownerName || '';
  var email = params.email || '';
  var phone = params.phone || '';

  var ss = SpreadsheetApp.create('Garage Records - ' + businessName);

  // --- Visits (legacy) ---
  var visits = ss.getActiveSheet();
  visits.setName('Visits');
  var vh = ['Date & Time','Customer Name','Phone','Vehicle Number','Vehicle Model','Service Type','Amount','Staff Name','Notes'];
  visits.appendRow(vh);
  _getOrCreateSheet(ss, 'Visits', vh, [150,180,130,140,140,170,100,130,200]);
  // headers already set by getActiveSheet rename; just format
  visits.getRange(1,1,1,vh.length).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF');
  visits.setFrozenRows(1);

  // --- Customers ---
  _getOrCreateSheet(ss, 'Customers',
    ['CustomerID','Name','Mobile','AltPhone','Email','Address','City','CreatedDate','TotalSpent','LastServiceDate','NextServiceDue'],
    [100,160,120,120,180,200,120,140,100,140,140]);

  // --- Vehicles ---
  _getOrCreateSheet(ss, 'Vehicles',
    ['VehicleID','CustomerID','VehicleNumber','Brand','Model','Variant','FuelType','Year','EngineNo','ChassisNo','Color','Odometer'],
    [100,100,140,120,120,100,100,80,140,140,80,100]);

  // --- JobCards ---
  _getOrCreateSheet(ss, 'JobCards',
    ['JobCardNumber','CustomerID','VehicleID','DateTimeIn','ServiceAdvisor','ServiceType','Priority','Status',
     'ComplaintType','ComplaintText','ComplaintPhotos','CustomerNotes','EstDelivery',
     'DeliveryDate','FinalOdometer','DeliveryNotes','SignatureURL','ReminderDate','Rating','Feedback'],
    [140,100,100,140,130,120,80,100,140,200,200,200,120,120,100,200,200,120,60,200]);

  // --- Inspection ---
  _getOrCreateSheet(ss, 'Inspection',
    ['InspectionID','JobCardNumber','Item','Status','Notes'],
    [100,140,140,120,250]);

  // --- WorkPerformed ---
  _getOrCreateSheet(ss, 'WorkPerformed',
    ['WorkID','JobCardNumber','TaskName','Technician','TimeTaken','Status'],
    [100,140,200,140,100,100]);

  // --- Parts ---
  _getOrCreateSheet(ss, 'Parts',
    ['PartUsageID','JobCardNumber','PartName','PartNumber','Qty','UnitPrice','TotalPrice','Supplier','Warranty'],
    [100,140,180,140,60,100,100,140,140]);

  // --- Billing ---
  _getOrCreateSheet(ss, 'Billing',
    ['BillID','JobCardNumber','LabourCharges','PartsCost','Discount','TaxPercent','TaxAmount','TotalAmount','PaymentStatus','PaymentMethod','PaidAmount','BillDate'],
    [100,140,110,100,80,80,100,110,100,110,100,140]);

  // --- Onboarding Docs ---
  var onboardSheet = ss.insertSheet('Onboarding Docs');
  onboardSheet.appendRow(['Field', 'Value']);
  onboardSheet.getRange(1,1,1,2).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF');
  onboardSheet.setFrozenRows(1);
  onboardSheet.setColumnWidth(1, 200);
  onboardSheet.setColumnWidth(2, 400);

  var onboardData = [
    ['Registration Date', _now()],
    ['Business Name', businessName], ['Owner Name', ownerName], ['Email', email], ['Phone', phone],
    ['--- IDENTITY PROOF ---', ''],
    ['Aadhaar Number', params.aadhaar||''], ['PAN Number', params.pan||''], ['Driving License', params.dl||''],
    ['--- BUSINESS PROOF ---', ''],
    ['GST Number', params.gst||''], ['License Type', params.licenseType||''], ['License Number', params.licenseNumber||''],
    ['--- BANK DETAILS ---', ''],
    ['Account Holder', params.accHolder||''], ['Bank Name', params.bankName||''], ['Account Number', params.accNumber||''], ['IFSC Code', params.ifsc||''],
    ['--- GARAGE DETAILS ---', ''],
    ['Garage Name', params.garageName||''], ['Garage Address', params.garageAddress||''], ['Garage Contact', params.garagePhone||''], ['Years of Experience', params.experience||''],
    ['--- AGREEMENT ---', ''],
    ['Agreement Accepted', params.agreementAccepted||'No'], ['Agreement Date', params.agreementDate||''],
    ['--- UPLOADED DOCUMENTS ---', '']
  ];
  onboardData.forEach(function(row) { onboardSheet.appendRow(row); });
  var lastRow = onboardSheet.getLastRow();
  for (var r = 2; r <= lastRow; r++) {
    if (onboardSheet.getRange(r,1).getValue().toString().indexOf('---') === 0)
      onboardSheet.getRange(r,1,1,2).setFontWeight('bold').setBackground('#E3F2FD');
  }

  // Drive folder
  var folder;
  try {
    folder = DriveApp.createFolder('Garage Docs - ' + businessName);
    onboardSheet.appendRow(['Documents Folder URL', folder.getUrl()]);
  } catch(e) {}

  // Share with email
  if (email && email.indexOf('@') !== -1) {
    try { ss.addEditor(email); } catch(e) {}
  }

  // Master log
  if (MASTER_LOG_ID) {
    try {
      var mss = SpreadsheetApp.openById(MASTER_LOG_ID);
      var ms = mss.getSheetByName('Clients');
      if (!ms) {
        ms = mss.insertSheet('Clients');
        ms.appendRow(['Date','Business','Owner','Email','Phone','Sheet ID','Sheet URL']);
        ms.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF');
      }
      ms.appendRow([_now(), businessName, ownerName, email, phone, ss.getId(), ss.getUrl()]);
    } catch(e) {}
  }

  return { success: true, sheetId: ss.getId(), sheetUrl: ss.getUrl(), message: 'Garage setup complete for ' + businessName };
}

// =============================================
// SEARCH CUSTOMER BY PHONE
// =============================================
function searchCustomer(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var cs = ss.getSheetByName('Customers');
  if (!cs || cs.getLastRow() <= 1) return { found: false };

  var data = cs.getDataRange().getValues();
  var phone = (params.phone || '').trim();
  var customer = null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][2].toString() === phone) {
      customer = {
        customerID: data[i][0], name: data[i][1], mobile: data[i][2],
        altPhone: data[i][3], email: data[i][4], address: data[i][5],
        city: data[i][6], totalSpent: data[i][8], lastService: data[i][9]
      };
      break;
    }
  }

  if (!customer) return { found: false };

  // Get vehicles for this customer
  var vs = ss.getSheetByName('Vehicles');
  var vehicles = [];
  if (vs && vs.getLastRow() > 1) {
    var vdata = vs.getDataRange().getValues();
    for (var j = 1; j < vdata.length; j++) {
      if (vdata[j][1] === customer.customerID) {
        vehicles.push({
          vehicleID: vdata[j][0], vehicleNumber: vdata[j][2], brand: vdata[j][3],
          model: vdata[j][4], variant: vdata[j][5], fuelType: vdata[j][6],
          year: vdata[j][7], color: vdata[j][10], odometer: vdata[j][11]
        });
      }
    }
  }

  return { found: true, customer: customer, vehicles: vehicles };
}

// =============================================
// CREATE JOB CARD (batched)
// =============================================
function createJobCard(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var cust = params.customer || {};
  var veh = params.vehicle || {};
  var job = params.jobCard || {};
  var complaints = params.complaints || {};
  var inspection = params.inspection || [];

  // 1. Find or create customer
  var customerID = cust.customerID || '';
  if (!customerID && cust.mobile) {
    var cs = _getOrCreateSheet(ss, 'Customers',
      ['CustomerID','Name','Mobile','AltPhone','Email','Address','City','CreatedDate','TotalSpent','LastServiceDate','NextServiceDue'],
      [100,160,120,120,180,200,120,140,100,140,140]);
    // Search existing
    if (cs.getLastRow() > 1) {
      var cdata = cs.getDataRange().getValues();
      for (var i = 1; i < cdata.length; i++) {
        if (cdata[i][2].toString() === cust.mobile.toString()) {
          customerID = cdata[i][0];
          break;
        }
      }
    }
    if (!customerID) {
      customerID = _generateId(cs, 'CUST');
      cs.appendRow([customerID, cust.name||'', cust.mobile||'', cust.altPhone||'', cust.email||'', cust.address||'', cust.city||'', _now(), 0, '', '']);
    }
  }

  // 2. Find or create vehicle
  var vehicleID = veh.vehicleID || '';
  if (!vehicleID && veh.vehicleNumber) {
    var vs = _getOrCreateSheet(ss, 'Vehicles',
      ['VehicleID','CustomerID','VehicleNumber','Brand','Model','Variant','FuelType','Year','EngineNo','ChassisNo','Color','Odometer'],
      [100,100,140,120,120,100,100,80,140,140,80,100]);
    if (vs.getLastRow() > 1) {
      var vdata = vs.getDataRange().getValues();
      for (var j = 1; j < vdata.length; j++) {
        if (vdata[j][2].toString().toUpperCase() === veh.vehicleNumber.toString().toUpperCase()) {
          vehicleID = vdata[j][0];
          // Update odometer
          if (veh.odometer) vs.getRange(j+1, 12).setValue(veh.odometer);
          break;
        }
      }
    }
    if (!vehicleID) {
      vehicleID = _generateId(vs, 'VEH');
      vs.appendRow([vehicleID, customerID, (veh.vehicleNumber||'').toUpperCase(), veh.brand||'', veh.model||'', veh.variant||'', veh.fuelType||'', veh.year||'', veh.engineNo||'', veh.chassisNo||'', veh.color||'', veh.odometer||'']);
    }
  }

  // 3. Create job card
  var jcs = _getOrCreateSheet(ss, 'JobCards',
    ['JobCardNumber','CustomerID','VehicleID','DateTimeIn','ServiceAdvisor','ServiceType','Priority','Status',
     'ComplaintType','ComplaintText','ComplaintPhotos','CustomerNotes','EstDelivery',
     'DeliveryDate','FinalOdometer','DeliveryNotes','SignatureURL','ReminderDate','Rating','Feedback'],
    [140,100,100,140,130,120,80,100,140,200,200,200,120,120,100,200,200,120,60,200]);

  var jcNumber = _generateJobCardNumber(jcs);
  var complaintTypes = '';
  if (complaints.types && Array.isArray(complaints.types)) complaintTypes = complaints.types.join(', ');

  jcs.appendRow([
    jcNumber, customerID, vehicleID, _now(),
    job.serviceAdvisor||'', job.serviceType||'', job.priority||'Medium', 'Open',
    complaintTypes, complaints.description||'', '', complaints.customerNotes||'',
    job.estimatedDelivery||'', '', '', '', '', '', '', ''
  ]);

  // 4. Add inspection records
  if (inspection.length > 0) {
    var ins = _getOrCreateSheet(ss, 'Inspection',
      ['InspectionID','JobCardNumber','Item','Status','Notes'], [100,140,140,120,250]);
    inspection.forEach(function(item) {
      var insId = _generateId(ins, 'INS');
      ins.appendRow([insId, jcNumber, item.item||'', item.status||'OK', item.notes||'']);
    });
  }

  // 5. Upload complaint photos
  var photoUrls = [];
  if (complaints.photos && complaints.photos.length > 0) {
    var folder = _getClientFolder(ss, params.sheetId);
    complaints.photos.forEach(function(photoB64, idx) {
      try {
        var b64 = photoB64;
        var mime = 'image/jpeg';
        if (b64.indexOf(',') !== -1) {
          var parts = b64.split(',');
          var m = parts[0].match(/data:(.*?);/);
          if (m) mime = m[1];
          b64 = parts[1];
        }
        var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, 'complaint_' + jcNumber + '_' + (idx+1) + '.jpg');
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrls.push(file.getUrl());
      } catch(e) {}
    });
    if (photoUrls.length > 0) {
      // Update complaint photos column in job card
      var lastJcRow = jcs.getLastRow();
      jcs.getRange(lastJcRow, 11).setValue(photoUrls.join(', '));
    }
  }

  return { success: true, jobCardNumber: jcNumber, customerID: customerID, vehicleID: vehicleID, message: 'Job card created' };
}

// =============================================
// GET JOB CARDS
// =============================================
function getJobCards(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var jcs = ss.getSheetByName('JobCards');
  if (!jcs || jcs.getLastRow() <= 1) return [];

  var data = jcs.getDataRange().getValues();
  var statusFilter = (params.status || 'all').toLowerCase();
  var results = [];

  // Also get customer names for display
  var cs = ss.getSheetByName('Customers');
  var custMap = {};
  if (cs && cs.getLastRow() > 1) {
    var cdata = cs.getDataRange().getValues();
    for (var c = 1; c < cdata.length; c++) custMap[cdata[c][0]] = cdata[c][1];
  }

  // Get vehicle numbers
  var vs = ss.getSheetByName('Vehicles');
  var vehMap = {};
  if (vs && vs.getLastRow() > 1) {
    var vdata = vs.getDataRange().getValues();
    for (var v = 1; v < vdata.length; v++) vehMap[vdata[v][0]] = vdata[v][2];
  }

  for (var i = data.length - 1; i >= 1; i--) {
    var status = (data[i][7] || '').toString().toLowerCase();
    if (statusFilter !== 'all' && status !== statusFilter) continue;
    results.push({
      jobCardNumber: data[i][0], customerID: data[i][1], vehicleID: data[i][2],
      customerName: custMap[data[i][1]] || '', vehicleNumber: vehMap[data[i][2]] || '',
      dateTimeIn: data[i][3].toString(), serviceAdvisor: data[i][4], serviceType: data[i][5],
      priority: data[i][6], status: data[i][7], complaintType: data[i][8],
      estDelivery: data[i][12].toString()
    });
  }
  return results;
}

// =============================================
// GET SINGLE JOB CARD DETAIL
// =============================================
function getJobCard(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var jcNum = params.jobCardNumber;

  // Job card
  var jcs = ss.getSheetByName('JobCards');
  if (!jcs || jcs.getLastRow() <= 1) return { error: 'Job card not found' };
  var jcData = jcs.getDataRange().getValues();
  var jc = null, jcRow = -1;
  for (var i = 1; i < jcData.length; i++) {
    if (jcData[i][0] === jcNum) { jc = jcData[i]; jcRow = i + 1; break; }
  }
  if (!jc) return { error: 'Job card not found' };

  // Customer
  var cs = ss.getSheetByName('Customers');
  var customer = {};
  if (cs && cs.getLastRow() > 1) {
    var cdata = cs.getDataRange().getValues();
    for (var c = 1; c < cdata.length; c++) {
      if (cdata[c][0] === jc[1]) {
        customer = { customerID: cdata[c][0], name: cdata[c][1], mobile: cdata[c][2], altPhone: cdata[c][3], email: cdata[c][4], address: cdata[c][5], city: cdata[c][6] };
        break;
      }
    }
  }

  // Vehicle
  var vs = ss.getSheetByName('Vehicles');
  var vehicle = {};
  if (vs && vs.getLastRow() > 1) {
    var vdata = vs.getDataRange().getValues();
    for (var v = 1; v < vdata.length; v++) {
      if (vdata[v][0] === jc[2]) {
        vehicle = { vehicleID: vdata[v][0], vehicleNumber: vdata[v][2], brand: vdata[v][3], model: vdata[v][4], variant: vdata[v][5], fuelType: vdata[v][6], year: vdata[v][7], color: vdata[v][10], odometer: vdata[v][11] };
        break;
      }
    }
  }

  // Inspection
  var ins = ss.getSheetByName('Inspection');
  var inspection = [];
  if (ins && ins.getLastRow() > 1) {
    var idata = ins.getDataRange().getValues();
    for (var ii = 1; ii < idata.length; ii++) {
      if (idata[ii][1] === jcNum) inspection.push({ item: idata[ii][2], status: idata[ii][3], notes: idata[ii][4] });
    }
  }

  // Work
  var ws = ss.getSheetByName('WorkPerformed');
  var work = [];
  if (ws && ws.getLastRow() > 1) {
    var wdata = ws.getDataRange().getValues();
    for (var w = 1; w < wdata.length; w++) {
      if (wdata[w][1] === jcNum) work.push({ workID: wdata[w][0], taskName: wdata[w][2], technician: wdata[w][3], timeTaken: wdata[w][4], status: wdata[w][5] });
    }
  }

  // Parts
  var ps = ss.getSheetByName('Parts');
  var parts = [];
  if (ps && ps.getLastRow() > 1) {
    var pdata = ps.getDataRange().getValues();
    for (var p = 1; p < pdata.length; p++) {
      if (pdata[p][1] === jcNum) parts.push({ partName: pdata[p][2], partNumber: pdata[p][3], qty: pdata[p][4], unitPrice: pdata[p][5], totalPrice: pdata[p][6], supplier: pdata[p][7], warranty: pdata[p][8] });
    }
  }

  // Billing
  var bs = ss.getSheetByName('Billing');
  var billing = null;
  if (bs && bs.getLastRow() > 1) {
    var bdata = bs.getDataRange().getValues();
    for (var b = 1; b < bdata.length; b++) {
      if (bdata[b][1] === jcNum) {
        billing = { billID: bdata[b][0], labourCharges: bdata[b][2], partsCost: bdata[b][3], discount: bdata[b][4], taxPercent: bdata[b][5], taxAmount: bdata[b][6], totalAmount: bdata[b][7], paymentStatus: bdata[b][8], paymentMethod: bdata[b][9], paidAmount: bdata[b][10], billDate: bdata[b][11].toString() };
        break;
      }
    }
  }

  return {
    jobCard: {
      jobCardNumber: jc[0], customerID: jc[1], vehicleID: jc[2], dateTimeIn: jc[3].toString(),
      serviceAdvisor: jc[4], serviceType: jc[5], priority: jc[6], status: jc[7],
      complaintType: jc[8], complaintText: jc[9], complaintPhotos: jc[10], customerNotes: jc[11],
      estDelivery: jc[12].toString(), deliveryDate: jc[13].toString(), finalOdometer: jc[14],
      deliveryNotes: jc[15], signatureURL: jc[16], reminderDate: jc[17].toString(),
      rating: jc[18], feedback: jc[19]
    },
    customer: customer, vehicle: vehicle, inspection: inspection, work: work, parts: parts, billing: billing
  };
}

// =============================================
// UPDATE JOB CARD
// =============================================
function updateJobCardFn(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var jcs = ss.getSheetByName('JobCards');
  if (!jcs) return { error: 'JobCards sheet not found' };

  var data = jcs.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === params.jobCardNumber) {
      var row = i + 1;
      if (params.status) jcs.getRange(row, 8).setValue(params.status);
      if (params.rating) jcs.getRange(row, 19).setValue(params.rating);
      if (params.feedback) jcs.getRange(row, 20).setValue(params.feedback);
      if (params.reminderDate) jcs.getRange(row, 18).setValue(params.reminderDate);
      return { success: true, message: 'Job card updated' };
    }
  }
  return { error: 'Job card not found' };
}

// =============================================
// ADD WORK PERFORMED
// =============================================
function addWork(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var ws = _getOrCreateSheet(ss, 'WorkPerformed',
    ['WorkID','JobCardNumber','TaskName','Technician','TimeTaken','Status'], [100,140,200,140,100,100]);
  var workId = _generateId(ws, 'WK');
  ws.appendRow([workId, params.jobCardNumber, params.taskName||'', params.technician||'', params.timeTaken||'', params.workStatus||'Pending']);
  return { success: true, workID: workId, message: 'Work added' };
}

// =============================================
// ADD PARTS
// =============================================
function addParts(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var ps = _getOrCreateSheet(ss, 'Parts',
    ['PartUsageID','JobCardNumber','PartName','PartNumber','Qty','UnitPrice','TotalPrice','Supplier','Warranty'],
    [100,140,180,140,60,100,100,140,140]);
  var partId = _generateId(ps, 'PT');
  var qty = parseFloat(params.qty) || 1;
  var price = parseFloat(params.unitPrice) || 0;
  var total = qty * price;
  ps.appendRow([partId, params.jobCardNumber, params.partName||'', params.partNumber||'', qty, price, total, params.supplier||'', params.warranty||'']);
  return { success: true, partID: partId, totalPrice: total, message: 'Part added' };
}

// =============================================
// CREATE BILLING
// =============================================
function createBilling(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var bs = _getOrCreateSheet(ss, 'Billing',
    ['BillID','JobCardNumber','LabourCharges','PartsCost','Discount','TaxPercent','TaxAmount','TotalAmount','PaymentStatus','PaymentMethod','PaidAmount','BillDate'],
    [100,140,110,100,80,80,100,110,100,110,100,140]);

  // Calculate parts cost from Parts sheet
  var ps = ss.getSheetByName('Parts');
  var partsCost = 0;
  if (ps && ps.getLastRow() > 1) {
    var pdata = ps.getDataRange().getValues();
    for (var p = 1; p < pdata.length; p++) {
      if (pdata[p][1] === params.jobCardNumber) partsCost += (parseFloat(pdata[p][6]) || 0);
    }
  }

  var labour = parseFloat(params.labourCharges) || 0;
  var discount = parseFloat(params.discount) || 0;
  var taxPct = parseFloat(params.taxPercent) || 18;
  var subtotal = labour + partsCost - discount;
  var taxAmt = Math.round(subtotal * taxPct / 100);
  var total = subtotal + taxAmt;
  var paid = parseFloat(params.paidAmount) || 0;
  var payStatus = paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

  var billId = _generateId(bs, 'BILL');
  bs.appendRow([billId, params.jobCardNumber, labour, partsCost, discount, taxPct, taxAmt, total, payStatus, params.paymentMethod||'', paid, _now()]);

  // Update customer total spent
  var jcs = ss.getSheetByName('JobCards');
  if (jcs) {
    var jdata = jcs.getDataRange().getValues();
    for (var j = 1; j < jdata.length; j++) {
      if (jdata[j][0] === params.jobCardNumber) {
        var custId = jdata[j][1];
        var cs = ss.getSheetByName('Customers');
        if (cs) {
          var cdata = cs.getDataRange().getValues();
          for (var c = 1; c < cdata.length; c++) {
            if (cdata[c][0] === custId) {
              var prevTotal = parseFloat(cdata[c][8]) || 0;
              cs.getRange(c+1, 9).setValue(prevTotal + total);
              cs.getRange(c+1, 10).setValue(_now());
              break;
            }
          }
        }
        break;
      }
    }
  }

  return { success: true, billID: billId, partsCost: partsCost, taxAmount: taxAmt, totalAmount: total, message: 'Bill created' };
}

// =============================================
// UPDATE DELIVERY
// =============================================
function updateDelivery(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var jcs = ss.getSheetByName('JobCards');
  if (!jcs) return { error: 'JobCards sheet not found' };

  var data = jcs.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === params.jobCardNumber) {
      var row = i + 1;
      jcs.getRange(row, 8).setValue('Delivered');
      jcs.getRange(row, 14).setValue(_now());
      if (params.finalOdometer) jcs.getRange(row, 15).setValue(params.finalOdometer);
      if (params.deliveryNotes) jcs.getRange(row, 16).setValue(params.deliveryNotes);
      if (params.reminderDate) jcs.getRange(row, 18).setValue(params.reminderDate);

      // Upload signature if provided
      if (params.signatureData) {
        try {
          var folder = _getClientFolder(ss, params.sheetId);
          var b64 = params.signatureData;
          if (b64.indexOf(',') !== -1) b64 = b64.split(',')[1];
          var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'signature_' + params.jobCardNumber + '.png');
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          jcs.getRange(row, 17).setValue(file.getUrl());
        } catch(e) {}
      }

      // Update vehicle odometer
      if (params.finalOdometer && data[i][2]) {
        var vs = ss.getSheetByName('Vehicles');
        if (vs && vs.getLastRow() > 1) {
          var vdata = vs.getDataRange().getValues();
          for (var v = 1; v < vdata.length; v++) {
            if (vdata[v][0] === data[i][2]) { vs.getRange(v+1, 12).setValue(params.finalOdometer); break; }
          }
        }
      }

      return { success: true, message: 'Vehicle delivered' };
    }
  }
  return { error: 'Job card not found' };
}

// =============================================
// GET SERVICE HISTORY
// =============================================
function getServiceHistory(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var jcs = ss.getSheetByName('JobCards');
  if (!jcs || jcs.getLastRow() <= 1) return [];

  var data = jcs.getDataRange().getValues();
  var results = [];

  // Get vehicle numbers
  var vs = ss.getSheetByName('Vehicles');
  var vehMap = {};
  if (vs && vs.getLastRow() > 1) {
    var vdata = vs.getDataRange().getValues();
    for (var v = 1; v < vdata.length; v++) vehMap[vdata[v][0]] = vdata[v][2] + ' ' + vdata[v][3] + ' ' + vdata[v][4];
  }

  // Get billing
  var bs = ss.getSheetByName('Billing');
  var billMap = {};
  if (bs && bs.getLastRow() > 1) {
    var bdata = bs.getDataRange().getValues();
    for (var b = 1; b < bdata.length; b++) billMap[bdata[b][1]] = { total: bdata[b][7], status: bdata[b][8] };
  }

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === params.customerID) {
      var bill = billMap[data[i][0]] || {};
      results.push({
        jobCardNumber: data[i][0], dateTimeIn: data[i][3].toString(),
        serviceType: data[i][5], status: data[i][7],
        vehicleInfo: vehMap[data[i][2]] || data[i][2],
        totalAmount: bill.total || 0, paymentStatus: bill.status || ''
      });
    }
  }
  return results;
}

// =============================================
// DASHBOARD STATS
// =============================================
function getDashboardStats(params) {
  var ss = SpreadsheetApp.openById(params.sheetId);
  var stats = { todayJobs: 0, openJobs: 0, pendingDelivery: 0, totalCustomers: 0, todayRevenue: 0 };

  var jcs = ss.getSheetByName('JobCards');
  if (jcs && jcs.getLastRow() > 1) {
    var data = jcs.getDataRange().getValues();
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
    for (var i = 1; i < data.length; i++) {
      var dateStr = data[i][3].toString();
      if (dateStr.indexOf(today) === 0) stats.todayJobs++;
      var st = (data[i][7]||'').toString().toLowerCase();
      if (st === 'open' || st === 'inprogress') stats.openJobs++;
      if (st === 'completed') stats.pendingDelivery++;
    }
  }

  var cs = ss.getSheetByName('Customers');
  if (cs) stats.totalCustomers = Math.max(0, cs.getLastRow() - 1);

  var bs = ss.getSheetByName('Billing');
  if (bs && bs.getLastRow() > 1) {
    var bdata = bs.getDataRange().getValues();
    var today2 = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
    for (var b = 1; b < bdata.length; b++) {
      if (bdata[b][11].toString().indexOf(today2) === 0) stats.todayRevenue += (parseFloat(bdata[b][7]) || 0);
    }
  }

  return stats;
}

// =============================================
// HELPER: Get/create client Drive folder
// =============================================
function _getClientFolder(ss, sheetId) {
  var onboard = ss.getSheetByName('Onboarding Docs');
  if (onboard) {
    var data = onboard.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'Documents Folder URL' && data[i][1]) {
        try {
          var fid = data[i][1].toString().match(/folders\/([a-zA-Z0-9_-]+)/);
          if (fid) return DriveApp.getFolderById(fid[1]);
        } catch(e) {}
      }
    }
  }
  var folder = DriveApp.createFolder('Garage Docs - ' + sheetId);
  if (onboard) onboard.appendRow(['Documents Folder URL', folder.getUrl()]);
  return folder;
}

// =============================================
// LEGACY: ADD VISIT RECORD
// =============================================
function addRecord(params) {
  var sheetId = params.sheetId;
  if (!sheetId) return { error: 'sheetId is required' };
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName('Visits');
  if (!sheet) {
    sheet = ss.insertSheet('Visits');
    sheet.appendRow(['Date & Time','Customer Name','Phone','Vehicle Number','Vehicle Model','Service Type','Amount','Staff Name','Notes']);
  }
  sheet.appendRow([_now(), params.customerName||'', params.phone||'', (params.vehicleNumber||'').toUpperCase(), params.vehicleModel||'', params.serviceType||'', params.amount||'', params.staffName||'', params.notes||'']);
  return { success: true, message: 'Record saved' };
}

// =============================================
// SEARCH RECORDS (enhanced)
// =============================================
function searchRecords(params) {
  var sheetId = params.sheetId;
  var query = params.query || '';
  var type = params.type || 'phone';
  if (!sheetId) return { error: 'sheetId is required' };
  if (!query) return [];

  var ss = SpreadsheetApp.openById(sheetId);
  var q = query.toString().toLowerCase().trim();
  var results = [];

  // Search in JobCards + Customers + Vehicles
  var jcs = ss.getSheetByName('JobCards');
  var cs = ss.getSheetByName('Customers');
  var vs = ss.getSheetByName('Vehicles');

  var custMap = {}, vehMap = {};
  if (cs && cs.getLastRow() > 1) {
    var cdata = cs.getDataRange().getValues();
    for (var c = 1; c < cdata.length; c++) {
      custMap[cdata[c][0]] = { name: cdata[c][1], mobile: cdata[c][2] };
    }
  }
  if (vs && vs.getLastRow() > 1) {
    var vdata = vs.getDataRange().getValues();
    for (var v = 1; v < vdata.length; v++) {
      vehMap[vdata[v][0]] = { number: vdata[v][2], brand: vdata[v][3], model: vdata[v][4] };
    }
  }

  if (jcs && jcs.getLastRow() > 1) {
    var jdata = jcs.getDataRange().getValues();
    for (var j = jdata.length - 1; j >= 1; j--) {
      var cust = custMap[jdata[j][1]] || {};
      var veh = vehMap[jdata[j][2]] || {};
      var match = false;

      if (type === 'phone') match = (cust.mobile||'').toString().toLowerCase().indexOf(q) !== -1;
      else if (type === 'vehicle') match = (veh.number||'').toString().toLowerCase().indexOf(q) !== -1;
      else if (type === 'jobcard') match = (jdata[j][0]||'').toString().toLowerCase().indexOf(q) !== -1;
      else match = (cust.name||'').toString().toLowerCase().indexOf(q) !== -1 || (cust.mobile||'').toString().indexOf(q) !== -1;

      if (match) {
        results.push({
          jobCardNumber: jdata[j][0], date: jdata[j][3].toString(),
          customerName: cust.name||'', phone: cust.mobile||'',
          vehicleNumber: veh.number||'', vehicleModel: (veh.brand||'') + ' ' + (veh.model||''),
          serviceType: jdata[j][5], status: jdata[j][7], priority: jdata[j][6],
          amount: ''
        });
      }
    }
  }

  // Also search legacy Visits
  var sheet = ss.getSheetByName('Visits');
  if (sheet && sheet.getLastRow() > 1) {
    var data = sheet.getDataRange().getValues();
    var colIndex = (type === 'vehicle') ? 3 : 2;
    for (var i = 1; i < data.length; i++) {
      var cellVal = (data[i][colIndex]||'').toString().toLowerCase();
      if (cellVal.indexOf(q) !== -1) {
        results.push({
          date: data[i][0].toString(), customerName: data[i][1].toString(), phone: data[i][2].toString(),
          vehicleNumber: data[i][3].toString(), vehicleModel: data[i][4].toString(),
          serviceType: data[i][5].toString(), amount: data[i][6].toString(),
          staffName: data[i][7].toString(), notes: data[i][8].toString(), legacy: true
        });
      }
    }
  }

  return results;
}

// =============================================
// UPLOAD FILE
// =============================================
function uploadFile(params) {
  var sheetId = params.sheetId;
  var docType = params.docType || 'document';
  var fileName = params.fileName || 'upload.jpg';
  var fileData = params.fileData || '';
  if (!sheetId) return { error: 'sheetId is required' };
  if (!fileData) return { error: 'fileData is required' };

  var base64 = fileData, mimeType = 'image/jpeg';
  if (base64.indexOf(',') !== -1) {
    var parts = base64.split(',');
    var m = parts[0].match(/data:(.*?);/);
    if (m) mimeType = m[1];
    base64 = parts[1];
  }

  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, docType + '_' + fileName);
  var ss = SpreadsheetApp.openById(sheetId);
  var folder = _getClientFolder(ss, sheetId);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileUrl = file.getUrl();

  var onboard = ss.getSheetByName('Onboarding Docs');
  if (onboard) onboard.appendRow([docType + ' Document', fileUrl]);

  return { success: true, fileUrl: fileUrl, message: docType + ' uploaded successfully' };
}
