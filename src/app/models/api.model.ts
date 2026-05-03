export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface ComplaintPayload {
  user_id: number;
  category: string;
  location: string;
  description: string;
  complaint_image?: string;
  [key: string]: unknown;
}

export interface ReopenComplaintPayload {
  complaint_code: string;
  user_id: number;
  reason: string;
}

export interface DashboardStatsResponse {
  total: number;
  [key: string]: unknown;
}
