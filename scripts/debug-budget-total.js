const XLSX = require('xlsx');

// Check the approved budget file
const wb = XLSX.readFile('C:/Users/A227493/Downloads/Approved Budget 2026.xlsx');
console.log('Sheets:', wb.SheetNames);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);
console.log('Rows:', rows.length);
if (rows.length > 0) {
  console.log('Columns:', Object.keys(rows[0]));
  console.log('First row:', JSON.stringify(rows[0], null, 2));
}

// Find the budget column
const budgetCol = Object.keys(rows[0] || {}).find(k => k.toLowerCase().includes('budget') || k.toLowerCase().includes('amount'));
console.log('\nBudget column:', budgetCol);

if (budgetCol) {
  const total = rows.reduce((s, r) => {
    const val = String(r[budgetCol] || '0').replace(/[, ]/g, '');
    return s + (parseFloat(val) || 0);
  }, 0);
  console.log('Total approved budget:', total.toFixed(2));
}

// Also check the balance file
console.log('\n=== Budget Balance File ===');
const wb2 = XLSX.readFile('C:/Users/A227493/Downloads/2026 budget balance (updated on 14 Sep 2026) 2.xlsx');
console.log('Sheets:', wb2.SheetNames);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
const rows2 = XLSX.utils.sheet_to_json(sheet2);
console.log('Rows:', rows2.length);
if (rows2.length > 0) {
  console.log('Columns:', Object.keys(rows2[0]));
  console.log('First row:', JSON.stringify(rows2[0], null, 2));
}
