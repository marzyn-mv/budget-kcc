const XLSX = require('xlsx');

// 1. Budget
const budgetFiles = require('fs').readdirSync('C:/Users/A227493/Downloads/').filter(f => f.toLowerCase().includes('budget') && f.endsWith('.xlsx') && !f.startsWith('~'));
console.log('Budget-related files:', budgetFiles);

// Let's check if there's a budget file that was uploaded
// The budget_items table stores: fund, activity_detail, prog, section, center_name, gl_code, budget
// We need to find the original budget upload file

// 2. PO Report
const wb1 = XLSX.readFile('C:/Users/A227493/Downloads/PO Report.xlsx');
const poRows = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);
const activePOs = poRows.filter(r => String(r.Cancelled || '') !== 'Yes');
const poTotal = activePOs.reduce((s, r) => s + (Number(r[' Total ']) || Number(r.Total) || 0), 0);

// 3. Voucher Report
const wb2 = XLSX.readFile('C:/Users/A227493/Downloads/Voucher Detailed Report - 11 Sep 2026 184853.xlsx');
const vRows = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
const activeVouchers = vRows.filter(r => String(r.Cancelled || '') !== 'Yes');

// PO numbers from active POs
const poNums = new Set(activePOs.map(r => String(r.PoFull || '')).filter(Boolean));

// Other PV = vouchers NOT linked to a PO
const otherPV = activeVouchers.filter(r => {
  const po = String(r.PO || '');
  return !po || po === '' || po === '-' || !poNums.has(po);
});
const otherPVTotal = otherPV.reduce((s, r) => s + (Number(r.Total) || 0), 0);

// Vouchers WITH matching PO (these are excluded from spent)
const linkedVouchers = activeVouchers.filter(r => {
  const po = String(r.PO || '');
  return po && po !== '' && po !== '-' && poNums.has(po);
});
const linkedVTotal = linkedVouchers.reduce((s, r) => s + (Number(r.Total) || 0), 0);

console.log('\n=== SPENT BREAKDOWN ===');
console.log('Active POs:', activePOs.length, '| Total:', poTotal.toFixed(2));
console.log('Other PV (vouchers without PO):', otherPV.length, '| Total:', otherPVTotal.toFixed(2));
console.log('TOTAL SPENT (PO + Other PV):', (poTotal + otherPVTotal).toFixed(2));

console.log('\n=== EXCLUDED FROM SPENT ===');
console.log('Vouchers linked to existing PO:', linkedVouchers.length, '| Total:', linkedVTotal.toFixed(2));
console.log('(These are NOT counted because the PO amount is already counted)');

console.log('\n=== THE PROBLEM ===');
console.log('PO total alone is', poTotal.toFixed(2));
console.log('This is the FULL CONTRACT VALUE of all POs.');
console.log('A PO for 1,000,000 means 1M is committed even if only 200K paid.');
console.log('');

// Check: how many POs have voucher payments?
const posWithVouchers = new Set();
activeVouchers.forEach(r => {
  const po = String(r.PO || '');
  if (po && po !== '-' && poNums.has(po)) posWithVouchers.add(po);
});
const posWithoutVouchers = activePOs.filter(r => !posWithVouchers.has(String(r.PoFull || '')));
const posWithVouchersList = activePOs.filter(r => posWithVouchers.has(String(r.PoFull || '')));

const poWithVTotal = posWithVouchersList.reduce((s, r) => s + (Number(r[' Total ']) || Number(r.Total) || 0), 0);
const poWithoutVTotal = posWithoutVouchers.reduce((s, r) => s + (Number(r[' Total ']) || Number(r.Total) || 0), 0);

console.log('POs WITH voucher payments:', posWithVouchersList.length, '| PO amount:', poWithVTotal.toFixed(2), '| Voucher amount:', linkedVTotal.toFixed(2));
console.log('POs WITHOUT any voucher:', posWithoutVouchers.length, '| PO amount:', poWithoutVTotal.toFixed(2));
console.log('');
console.log('The PO amount for items WITH vouchers is', poWithVTotal.toFixed(2));
console.log('But only', linkedVTotal.toFixed(2), 'has actually been paid via vouchers.');
console.log('Difference (over-counted):', (poWithVTotal - linkedVTotal).toFixed(2));

// ACR
const wb3 = XLSX.readFile('C:/Users/A227493/Downloads/ACR Detailed Report - 11 Sep 2026 185007.xlsx');
const acrRows = XLSX.utils.sheet_to_json(wb3.Sheets[wb3.SheetNames[0]]);
const activeACR = acrRows.filter(r => String(r.Cancelled || '') !== 'Yes');
const acrTotal = activeACR.reduce((s, r) => s + (Number(r.Amt) || Number(r.Total) || 0), 0);
console.log('\nACR total (not deducted):', acrTotal.toFixed(2));
