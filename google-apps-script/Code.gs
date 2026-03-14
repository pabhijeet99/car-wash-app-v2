// =============================================
// CAR WASH MANAGER — Master Google Apps Script
// Deploy this ONCE. All clients share this URL.
// Each client gets their own Google Sheet
// automatically created on first registration.
// =============================================

// (Optional) Your own spreadsheet ID to track all registered clients
// Create a blank Google Sheet, copy its ID here to log all clients
// Leave empty '' if you don't want client tracking
var MASTER_LOG_ID = '';

// =============================================
// MAIN REQUEST HANDLER
// =============================================
function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    if (action === 'register') {
      result = registerNewClient(e.parameter);
    } else if (action === 'add') {
      result = addRecord(e.parameter);
    } else if (action === 'search') {
      result = searchRecords(e.parameter);
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var params;
  var result;

  try {
    // Support both form-encoded (e.parameter) and JSON body (text/plain)
    if (e.postData && e.postData.type === 'text/plain') {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }

    var action = params.action;

    if (action === 'uploadFile') {
      result = uploadFile(params);
    } else {
      result = { error: 'Unknown POST action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
// REGISTER NEW CLIENT
// Creates a new Google Sheet for the client
// Shares it with their email
// Returns the Sheet ID to the app
// =============================================
function registerNewClient(params) {
  var businessName = params.businessName || 'Car Wash';
  var ownerName    = params.ownerName    || '';
  var email        = params.email        || '';
  var phone        = params.phone        || '';

  // 1. Create a brand new Google Sheet in the script owner's Drive
  var ss    = SpreadsheetApp.create('Car Wash Records - ' + businessName);
  var sheet = ss.getActiveSheet();
  sheet.setName('Visits');

  // 2. Add headers with formatting
  var headers = [
    'Date & Time', 'Customer Name', 'Phone',
    'Vehicle Number', 'Vehicle Model', 'Service Type',
    'Amount (₹)', 'Staff Name', 'Notes'
  ];
  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1565C0');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('CENTER');
  sheet.setFrozenRows(1);

  // Set column widths
  var widths = [150, 180, 130, 140, 140, 170, 100, 130, 200];
  widths.forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });

  // 3. Create Onboarding Docs sheet with all verification details
  var onboardSheet = ss.insertSheet('Onboarding Docs');
  var obHeaders = [
    'Field', 'Value'
  ];
  onboardSheet.appendRow(obHeaders);
  var obHeaderRange = onboardSheet.getRange(1, 1, 1, obHeaders.length);
  obHeaderRange.setFontWeight('bold');
  obHeaderRange.setBackground('#1565C0');
  obHeaderRange.setFontColor('#FFFFFF');
  onboardSheet.setFrozenRows(1);
  onboardSheet.setColumnWidth(1, 200);
  onboardSheet.setColumnWidth(2, 400);

  // Write onboarding data as key-value rows
  var onboardData = [
    ['Registration Date', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm')],
    ['Business Name', businessName],
    ['Owner Name', ownerName],
    ['Email', email],
    ['Phone', phone],
    ['--- IDENTITY PROOF ---', ''],
    ['Aadhaar Number', params.aadhaar || ''],
    ['PAN Number', params.pan || ''],
    ['Driving License', params.dl || ''],
    ['--- BUSINESS PROOF ---', ''],
    ['GST Number', params.gst || ''],
    ['License Type', params.licenseType || ''],
    ['License Number', params.licenseNumber || ''],
    ['--- BANK DETAILS ---', ''],
    ['Account Holder', params.accHolder || ''],
    ['Bank Name', params.bankName || ''],
    ['Account Number', params.accNumber || ''],
    ['IFSC Code', params.ifsc || ''],
    ['--- GARAGE DETAILS ---', ''],
    ['Garage Name', params.garageName || ''],
    ['Garage Address', params.garageAddress || ''],
    ['Garage Contact', params.garagePhone || ''],
    ['Years of Experience', params.experience || ''],
    ['--- AGREEMENT ---', ''],
    ['Agreement Accepted', params.agreementAccepted || 'No'],
    ['Agreement Date', params.agreementDate || ''],
    ['--- UPLOADED DOCUMENTS ---', '(URLs added when files are uploaded)']
  ];

  onboardData.forEach(function(row) {
    onboardSheet.appendRow(row);
  });

  // Bold section headers
  var lastRow = onboardSheet.getLastRow();
  for (var r = 2; r <= lastRow; r++) {
    var cellVal = onboardSheet.getRange(r, 1).getValue().toString();
    if (cellVal.indexOf('---') === 0) {
      onboardSheet.getRange(r, 1, 1, 2).setFontWeight('bold').setBackground('#E3F2FD');
    }
  }

  // 4. Create a Drive folder for this client's documents
  var folder;
  try {
    folder = DriveApp.createFolder('CarWash Docs - ' + businessName);
    // Store folder ID in the sheet for reference
    onboardSheet.appendRow(['Documents Folder URL', folder.getUrl()]);
  } catch (e) {
    // Folder creation failed — not critical
  }

  // 5. Share sheet with client's email (they get edit access)
  if (email && email.indexOf('@') !== -1) {
    try {
      ss.addEditor(email);
    } catch (e) {
      // Email sharing failed — not critical, continue
    }
  }

  // 6. Log this client in the master tracking sheet (optional)
  if (MASTER_LOG_ID) {
    try {
      var masterSS    = SpreadsheetApp.openById(MASTER_LOG_ID);
      var masterSheet = masterSS.getSheetByName('Clients');
      if (!masterSheet) {
        masterSheet = masterSS.insertSheet('Clients');
        masterSheet.appendRow([
          'Registration Date', 'Business Name', 'Owner Name',
          'Email', 'Phone', 'Aadhaar', 'PAN', 'GST',
          'Garage Name', 'Agreement', 'Sheet ID', 'Sheet URL'
        ]);
        masterSheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF');
      }
      masterSheet.appendRow([
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm'),
        businessName,
        ownerName,
        email,
        phone,
        params.aadhaar || '',
        params.pan || '',
        params.gst || '',
        params.garageName || '',
        params.agreementAccepted || 'No',
        ss.getId(),
        ss.getUrl()
      ]);
    } catch (e) {
      // Master logging failed — not critical
    }
  }

  return {
    success:  true,
    sheetId:  ss.getId(),
    sheetUrl: ss.getUrl(),
    message:  'Google Sheet created successfully for ' + businessName
  };
}

// =============================================
// ADD A VISIT RECORD
// =============================================
function addRecord(params) {
  var sheetId = params.sheetId;
  if (!sheetId) return { error: 'sheetId is required' };

  var ss    = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName('Visits');

  if (!sheet) {
    // Auto-recover: recreate Visits sheet if missing
    sheet = ss.insertSheet('Visits');
    sheet.appendRow(['Date & Time', 'Customer Name', 'Phone', 'Vehicle Number', 'Vehicle Model', 'Service Type', 'Amount (₹)', 'Staff Name', 'Notes']);
  }

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm');

  sheet.appendRow([
    now,
    params.customerName || '',
    params.phone        || '',
    (params.vehicleNumber || '').toUpperCase(),
    params.vehicleModel  || '',
    params.serviceType   || '',
    params.amount        || '',
    params.staffName     || '',
    params.notes         || ''
  ]);

  return { success: true, message: 'Record saved' };
}

// =============================================
// SEARCH RECORDS
// =============================================
function searchRecords(params) {
  var sheetId = params.sheetId;
  var query   = params.query || '';
  var type    = params.type  || 'phone';

  if (!sheetId) return { error: 'sheetId is required' };
  if (!query)   return [];

  var ss    = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName('Visits');
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var data     = sheet.getDataRange().getValues();
  var colIndex = (type === 'vehicle') ? 3 : 2;
  var q        = query.toString().toLowerCase().trim();
  var results  = [];

  for (var i = 1; i < data.length; i++) {
    var cellVal = (data[i][colIndex] || '').toString().toLowerCase();
    if (cellVal.indexOf(q) !== -1) {
      results.push({
        date:          data[i][0].toString(),
        customerName:  data[i][1].toString(),
        phone:         data[i][2].toString(),
        vehicleNumber: data[i][3].toString(),
        vehicleModel:  data[i][4].toString(),
        serviceType:   data[i][5].toString(),
        amount:        data[i][6].toString(),
        staffName:     data[i][7].toString(),
        notes:         data[i][8].toString()
      });
    }
  }

  return results;
}

// =============================================
// UPLOAD FILE TO GOOGLE DRIVE
// Receives base64 file data, saves to client's
// document folder, logs URL in Onboarding Docs
// =============================================
function uploadFile(params) {
  var sheetId  = params.sheetId;
  var docType  = params.docType  || 'document';
  var fileName = params.fileName || 'upload.jpg';
  var fileData = params.fileData || '';

  if (!sheetId) return { error: 'sheetId is required' };
  if (!fileData) return { error: 'fileData is required' };

  // Decode base64 data (strip data URL prefix if present)
  var base64 = fileData;
  var mimeType = 'image/jpeg';
  if (base64.indexOf(',') !== -1) {
    var parts = base64.split(',');
    var header = parts[0];
    base64 = parts[1];
    var mimeMatch = header.match(/data:(.*?);/);
    if (mimeMatch) mimeType = mimeMatch[1];
  }

  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, docType + '_' + fileName);

  // Find or create the client's document folder
  var ss = SpreadsheetApp.openById(sheetId);
  var onboardSheet = ss.getSheetByName('Onboarding Docs');

  var folder;
  // Try to find existing folder URL in onboarding sheet
  if (onboardSheet) {
    var data = onboardSheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'Documents Folder URL' && data[i][1]) {
        try {
          var folderId = data[i][1].toString().match(/folders\/([a-zA-Z0-9_-]+)/);
          if (folderId) {
            folder = DriveApp.getFolderById(folderId[1]);
          }
        } catch (e) {}
        break;
      }
    }
  }

  // If no folder found, create one
  if (!folder) {
    folder = DriveApp.createFolder('CarWash Docs - ' + sheetId);
    if (onboardSheet) {
      onboardSheet.appendRow(['Documents Folder URL', folder.getUrl()]);
    }
  }

  // Save file to folder
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileUrl = file.getUrl();

  // Log the file URL in Onboarding Docs sheet
  if (onboardSheet) {
    onboardSheet.appendRow([docType + ' Document', fileUrl]);
  }

  return {
    success: true,
    fileUrl: fileUrl,
    message: docType + ' uploaded successfully'
  };
}
