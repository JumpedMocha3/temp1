/***********************
* SYSTEM CONFIGURATION *
***********************/
const USER_SHEET_ID = '1LlgifXkncHbh7virVI0tPgCXbjgq3-NK9NwmmaKnFZE';
const REQUESTS_SHEET_ID = '1esGAH-9Dax8BoS1ZERhWLVYJNomg09mZ5i5V1-PYVEU';

/********************
* SHEET MANAGEMENT *
********************/
function getUserSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(USER_SHEET_ID);
    let sheet = spreadsheet.getSheetByName('الورقة1');
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet('الورقة1');
      Utilities.sleep(1000); // Allow time for sheet creation
    }
    
    // Clear existing data but preserve first row
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).clearContent();
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Username', 'Password', 'Role']);
    }
    
    // Add default users
    sheet.appendRow(['admin1', '123', 'admin']);
    sheet.appendRow(['worker1', '122', 'worker']);
    
    SpreadsheetApp.flush();
    return sheet;
  } catch (e) {
    throw new Error('Failed to initialize user sheet: ' + e.message);
  }
}

function getRequestsSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(REQUESTS_SHEET_ID);
    let sheet = spreadsheet.getSheetByName('الورقة1');
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet('الورقة1');
      Utilities.sleep(1000);
    }
    
    // Initialize headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'ID', 'Worker_Name', 'Project_Name', 'Items',
        'Status', 'Date', 'Rejection', 'Last_Updated'
      ]);
    }
    
    return sheet;
  } catch (e) {
    throw new Error('Failed to initialize requests sheet: ' + e.message);
  }
}

/********************
* USER AUTHENTICATION *
********************/
function verifyUser(username, password) {
  try {
    const sheet = getUserSheet();
    const data = sheet.getDataRange().getDisplayValues();
    
    console.log("All sheet data:", JSON.stringify(data));
    console.log(`Attempting login for: ${username}`);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedUser = String(row[0]).trim();
      const storedPass = String(row[1]).trim();
      const role = String(row[2]).trim().toLowerCase();
      
      console.log(`Checking row ${i}:`, {storedUser, storedPass, role});
      
      if (storedUser === username.trim() && storedPass === password.trim()) {
        console.log("Login successful for:", username);
        return {
          username: username,
          role: role
        };
      }
    }
    
    throw new Error(`No matching user found. Available users: ${JSON.stringify(data.slice(1))}`);
  } catch (e) {
    console.error("Authentication error:", e.message);
    throw new Error('Login failed: ' + e.message);
  }
}

/***********************
* REQUEST MANAGEMENT *
***********************/
function submitPurchaseRequest(requestData) {
  try {
    const sheet = getRequestsSheet();
    const id = Utilities.getUuid();
    
    sheet.appendRow([
      id,
      String(requestData.workerName).trim(),
      String(requestData.projectName).trim(),
      JSON.stringify(requestData.items || []),
      'Pending',
      new Date().toISOString(),
      '', // Rejection reason
      new Date().toISOString()
    ]);
    
    return {
      success: true,
      requestId: id,
      timestamp: new Date().toLocaleString()
    };
  } catch (e) {
    throw new Error('Failed to submit request: ' + e.message);
  }
}

function getWorkerRequests(email) {
  try {
    const sheet = getRequestsSheet();
    const data = sheet.getDataRange().getDisplayValues();
    const requests = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        requests.push({
          id: data[i][0],
          workerName: data[i][1],
          projectName: data[i][2],
          items: tryParseJSON(data[i][3]) || [],
          status: data[i][4],
          date: data[i][5],
          rejectionReason: data[i][6]
        });
      }
    }
    
    return requests;
  } catch (e) {
    throw new Error('Failed to get requests: ' + e.message);
  }
}

function getPendingRequests() {
  try {
    const sheet = getRequestsSheet();
    const data = sheet.getDataRange().getDisplayValues();
    return data
      .slice(1)
      .filter(row => row[4] === 'Pending')
      .map(row => ({
        id: row[0],
        workerName: row[1],
        projectName: row[2],
        items: tryParseJSON(row[3]) || [],
        date: row[5]
      }));
  } catch (e) {
    throw new Error('Failed to get pending requests: ' + e.message);
  }
}

/********************
* ADMIN FUNCTIONS *
********************/
function approveRequest(requestId) {
  try {
    const sheet = getRequestsSheet();
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) {
        sheet.getRange(i+1, 5).setValue('Approved');
        sheet.getRange(i+1, 8).setValue(new Date().toISOString());
        return { success: true };
      }
    }
    throw new Error('Request not found');
  } catch (e) {
    throw new Error('Approval failed: ' + e.message);
  }
}

function rejectRequest(requestId, reason) {
  try {
    const sheet = getRequestsSheet();
    const data = sheet.getDataRange().getDisplayValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) {
        sheet.getRange(i+1, 5).setValue('Rejected');
        sheet.getRange(i+1, 7).setValue(String(reason).trim());
        sheet.getRange(i+1, 8).setValue(new Date().toISOString());
        return { success: true };
      }
    }
    throw new Error('Request not found');
  } catch (e) {
    throw new Error('Rejection failed: ' + e.message);
  }
}

/********************
* HELPER FUNCTIONS *
********************/
function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

function initializeSystem() {
  try {
    const userSheet = getUserSheet();
    const requestSheet = getRequestsSheet();
    
    return {
      status: "SYSTEM_READY",
      userSheet: {
        name: userSheet.getName(),
        users: userSheet.getDataRange().getDisplayValues().slice(1)
      },
      requestSheet: {
        name: requestSheet.getName(),
        headers: requestSheet.getRange(1, 1, 1, 8).getDisplayValues()[0]
      }
    };
  } catch (e) {
    throw new Error('Initialization failed: ' + e.message);
  }
}

/***************
* WEB APP ENTRY *
***************/
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile(e.parameter.page || 'login')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function testAuth() {
  console.log("Starting authentication test...");
  
  // First reset and initialize the sheet
  try {
    console.log("Resetting user sheet...");
    const sheet = getUserSheet();
    const users = sheet.getDataRange().getDisplayValues();
    console.log("Current users:", JSON.stringify(users));
    
    // Test cases
    const tests = [
      {username: "admin1", password: "123", shouldPass: true},
      {username: "worker1", password: "122", shouldPass: true},
      {username: "admin1", password: "wrong", shouldPass: false},
      {username: "nonexistent", password: "123", shouldPass: false}
    ];
    
    const results = [];
    
    tests.forEach(test => {
      try {
        const result = verifyUser(test.username, test.password);
        if (test.shouldPass) {
          results.push(`✅ PASS: ${test.username} login successful (Role: ${result.role})`);
        } else {
          results.push(`❌ FAIL: ${test.username} should not have authenticated`);
        }
      } catch (e) {
        if (test.shouldPass) {
          results.push(`❌ FAIL: ${test.username} should have authenticated (Error: ${e.message})`);
        } else {
          results.push(`✅ PASS: ${test.username} correctly rejected (${e.message})`);
        }
      }
    });
    
    console.log("Test results:", results);
    return results;
    
  } catch (e) {
    console.error("Test failed completely:", e);
    return ["❌ Test failed: " + e.message];
  }
}

function runAuthTest() {
  return testAuth();
}

function inspectUsers() {
  const sheet = getUserSheet();
  const data = sheet.getDataRange().getDisplayValues();
  
  return {
    headers: data[0],
    adminRow: {
      raw: data[1],
      username: {
        value: data[1][0],
        length: data[1][0].length,
        charCodes: [...data[1][0]].map(c => c.charCodeAt(0))
      },
      password: {
        value: data[1][1],
        length: data[1][1].length,
        charCodes: [...data[1][1]].map(c => c.charCodeAt(0))
      }
    },
    workerRow: {
      raw: data[2],
      username: {
        value: data[2][0],
        length: data[2][0].length,
        charCodes: [...data[2][0]].map(c => c.charCodeAt(0))
      },
      password: {
        value: data[2][1],
        length: data[2][1].length,
        charCodes: [...data[2][1]].map(c => c.charCodeAt(0))
      }
    }
  };
}
