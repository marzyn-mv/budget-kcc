const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/A227493/Downloads/2026 budget balance (updated on 14 Sep 2026) 2.xlsx');

// Check the Budget Balance sheet
console.log('=== Budget Balance sheet ===');
const balSheet = wb.Sheets['Budget Balance'];
const balRows = XLSX.utils.sheet_to_json(balSheet);
console.log('Rows:', balRows.length);
if (balRows.length > 0) {
  console.log('Columns:', Object.keys(balRows[0]));
  console.log('First 3 rows:');
  balRows.slice(0, 3).forEach((r, i) => console.log(JSON.stringify(r)));
}

// Check the PO sheet to understand their PO calculation
console.log('\n=== PO 2026 sheet ===');
const poSheet = wb.Sheets['PO 2026'];
const poRows = XLSX.utils.sheet_to_json(poSheet);
console.log('Rows:', poRows.length);
if (poRows.length > 0) {
  console.log('Columns:', Object.keys(poRows[0]));
}

// Check Other PV sheet
console.log('\n=== Other PV sheet ===');
const pvSheet = wb.Sheets['Other PV'];
const pvRows = XLSX.utils.sheet_to_json(pvSheet);
console.log('Rows:', pvRows.length);
if (pvRows.length > 0) {
  console.log('Columns:', Object.keys(pvRows[0]));
  console.log('First row:', JSON.stringify(pvRows[0]));
}

// Check Approved budget sheet
console.log('\n=== Approved budget sheet ===');
const appSheet = wb.Sheets['Approved budget'];
const appRows = XLSX.utils.sheet_to_json(appSheet);
console.log('Rows:', appRows.length);
if (appRows.length > 0) {
  console.log('Columns:', Object.keys(appRows[0]));
}

// Check Reserved sheet
console.log('\n=== Reserved sheet ===');
const resSheet = wb.Sheets['Reserved'];
if (resSheet) {
  const resRows = XLSX.utils.sheet_to_json(resSheet);
  console.log('Rows:', resRows.length);
  if (resRows.length > 0) {
    console.log('Columns:', Object.keys(resRows[0]));
    console.log('First row:', JSON.stringify(resRows[0]));
  }
}
