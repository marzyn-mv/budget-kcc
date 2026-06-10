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
