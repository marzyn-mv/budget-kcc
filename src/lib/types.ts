export interface BudgetItem {
  id: number;
  act_code_id: number;
  active_id: number;
  fund: string;
  activity_detail: string;
  prog: string;
  center_name: string;
  gl_code: string;
  budget: string;
  po_spent: number;
  voucher_spent: number;
  acr_spent: number;
  budget_control: number;
  created_at: string;
  updated_at: string;
}

export interface UploadHistory {
  id: number;
  filename: string;
  rows_imported: number;
  uploaded_at: string;
  uploaded_by: string;
}

export interface LogEntry {
  id: number;
  level: string;
  action: string;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export interface POReport {
  id: number;
  upload_id: number;
  island_name: string;
  po_create_date: string;
  gl_code: string;
  po_full: string;
  supplier: string;
  total: number;
  po_remarks: string;
  biz_area: string;
  cost_center: string;
  fund_code: string;
  functional_area: string;
  activity_detail: string;
  center_name: string;
  authorisation: string;
  printed: string;
  cancelled: string;
  po_cancel_note: string;
  created_at: string;
}

export interface VoucherReport {
  id: number;
  upload_id: number;
  island_name: string;
  produce_date: string;
  gl_code: string;
  voucher_full: string;
  supplier: string;
  voucher_type: string;
  total: number;
  reason: string;
  biz_area: string;
  cost_center: string;
  fund_code: string;
  functional_area: string;
  activity_detail: string;
  center_name: string;
  authorisation: string;
  printed: string;
  cancelled: string;
  cancellation_reason: string;
  po: string;
  cheque_no: string;
  pay_by: string;
  created_at: string;
}

export interface ACRReport {
  id: number;
  upload_id: number;
  island_name: string;
  produce_date: string;
  budget_year: string;
  gl_code: string;
  voucher_full: string;
  total: number;
  remarks: string;
  biz_area: string;
  cost_center: string;
  fund_code: string;
  functional_area: string;
  activity_detail: string;
  center_name: string;
  authorisation: string;
  printed: string;
  cancelled: string;
  cancellation_reason: string;
  deposited: string;
  created_at: string;
}

export interface BudgetControl {
  id: number;
  upload_id: number;
  group_id: number;
  office_name: string;
  created_date: string;
  budget_control_date: string;
  budget_control_no: string;
  amount: number;
  cr_fund: string;
  cr_center: string;
  cr_activity: string;
  cr_gl_code: string;
  dr_fund: string;
  dr_center: string;
  dr_activity: string;
  dr_gl_code: string;
  uploaded_file: string;
  created_at: string;
}

export interface BudgetFilters {
  search?: string;
  fund?: string;
  center?: string;
  page?: number;
  limit?: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalItems: number;
  byFund: { fund: string; total: number; count: number }[];
  byCenter: { center: string; total: number; count: number }[];
}
