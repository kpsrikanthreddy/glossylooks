/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ServiceCategory,
  ServiceItem,
  PackageCombo,
  Appointment,
  Customer,
  Order,
  PaymentRecord,
  Product,
  Supplier,
  PurchaseOrder,
  InventoryMovement,
  Staff,
  PrintDevice,
  PrintJob,
  SalonSettings,
  GalleryItem,
  Enquiry,
  Review,
  User,
  AdminUser,
  AuditLog,
  DetailedSalesReport,
  SalesReportFilter,
  WhatsAppIntegration,
  WhatsAppStatusResponse,
  WhatsAppBusinessSettings,
  SalonBranch,
  BranchWhatsAppIntegration,
  BranchWhatsAppStatusResponse,
  WhatsAppMessageLog,
  AppointmentFeedback,
  ScheduledFeedbackJob
} from '../types/salon';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit, adminName?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {})
  };

  // Retrieve admin session token if available
  try {
    const savedSession = sessionStorage.getItem('the_glossy_looks_admin_session') || localStorage.getItem('the_glossy_looks_admin_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed.token) {
        headers['Authorization'] = `Bearer ${parsed.token}`;
      }
      if (parsed.user) {
        if (!headers['x-admin-name'] && (parsed.user.name || adminName)) {
          headers['x-admin-name'] = parsed.user.name || adminName || '';
        }
        if (parsed.user.role) {
          headers['x-admin-role'] = parsed.user.role;
        }
        if (parsed.user.id) {
          headers['x-admin-user-id'] = parsed.user.id;
        }
      }
    }
  } catch {
    // Ignore storage parse error
  }

  if (adminName && !headers['x-admin-name']) {
    headers['x-admin-name'] = adminName;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Settings
  getSettings: () => fetchJson<SalonSettings>(`${API_BASE}/settings`),
  updateSettings: (data: Partial<SalonSettings>, adminName?: string) =>
    fetchJson<SalonSettings>(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }, adminName),

  // Customer OTP & Private Portal
  sendCustomerOTP: (mobile: string) =>
    fetchJson<{ success: boolean; sessionId: string; message: string }>(`${API_BASE}/auth/customer/send-otp`, {
      method: 'POST',
      body: JSON.stringify({ mobile })
    }),
  verifyCustomerOTP: (mobile: string, otp: string) =>
    fetchJson<{ success: boolean; customer: Customer; token: string }>(`${API_BASE}/auth/customer/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ mobile, otp })
    }),
  getCustomerMe: (mobile: string) => fetchJson<Customer>(`${API_BASE}/customer/me?mobile=${encodeURIComponent(mobile)}`),
  getCustomerAppointments: (mobile: string) => fetchJson<Appointment[]>(`${API_BASE}/customer/appointments?mobile=${encodeURIComponent(mobile)}`),
  getCustomerOrders: (mobile: string) => fetchJson<Order[]>(`${API_BASE}/customer/orders?mobile=${encodeURIComponent(mobile)}`),

  // Admin Auth & User Management (Owner)
  loginAdmin: (identifier: string, password: string) =>
    fetchJson<{ success: boolean; token: string; user: AdminUser }>(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    }),
  getAdminMe: () => fetchJson<AdminUser>(`${API_BASE}/auth/admin/me`),
  getAdminUsers: () => fetchJson<User[]>(`${API_BASE}/admin/users`),
  createAdminUser: (data: Partial<User>, adminName?: string) =>
    fetchJson<User>(`${API_BASE}/admin/users`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateAdminUser: (id: string, data: Partial<User>, adminName?: string) =>
    fetchJson<User>(`${API_BASE}/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  resetAdminUserPassword: (id: string, newPassword: string, adminName?: string) =>
    fetchJson<{ success: boolean; message: string }>(`${API_BASE}/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    }, adminName),
  deleteAdminUser: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' }, adminName),

  // Categories & Services & Packages
  getCategories: () => fetchJson<ServiceCategory[]>(`${API_BASE}/categories`),
  createCategory: (data: Partial<ServiceCategory>, adminName?: string) =>
    fetchJson<ServiceCategory>(`${API_BASE}/categories`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateCategory: (id: string, data: Partial<ServiceCategory>, adminName?: string) =>
    fetchJson<ServiceCategory>(`${API_BASE}/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteCategory: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/categories/${id}`, { method: 'DELETE' }, adminName),

  getServices: (categoryId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<ServiceItem[]>(`${API_BASE}/services${qs}`);
  },
  createService: (data: Partial<ServiceItem>, adminName?: string) =>
    fetchJson<ServiceItem>(`${API_BASE}/services`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateService: (id: string, data: Partial<ServiceItem>, adminName?: string) =>
    fetchJson<ServiceItem>(`${API_BASE}/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteService: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/services/${id}`, { method: 'DELETE' }, adminName),

  getPackages: () => fetchJson<PackageCombo[]>(`${API_BASE}/packages`),
  createPackage: (data: Partial<PackageCombo>, adminName?: string) =>
    fetchJson<PackageCombo>(`${API_BASE}/packages`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updatePackage: (id: string, data: Partial<PackageCombo>, adminName?: string) =>
    fetchJson<PackageCombo>(`${API_BASE}/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deletePackage: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/packages/${id}`, { method: 'DELETE' }, adminName),

  // Appointments
  getAppointments: (filters?: { status?: string; staffId?: string; mobile?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.staffId) params.append('staff_id', filters.staffId);
    if (filters?.mobile) params.append('mobile', filters.mobile);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Appointment[]>(`${API_BASE}/appointments${qs}`);
  },
  getAppointmentById: (id: string) => fetchJson<Appointment>(`${API_BASE}/appointments/${id}`),
  createAppointment: (data: any, customerName?: string) =>
    fetchJson<Appointment>(`${API_BASE}/appointments`, { method: 'POST', body: JSON.stringify(data) }, customerName),
  updateAppointment: (id: string, data: Partial<Appointment>, adminName?: string) =>
    fetchJson<Appointment>(`${API_BASE}/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  cancelAppointment: (id: string, reason: string, adminName?: string) =>
    fetchJson<Appointment>(`${API_BASE}/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, adminName),

  // Customers
  getCustomers: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJson<Customer[]>(`${API_BASE}/customers${qs}`);
  },
  createCustomer: (data: Partial<Customer>, adminName?: string) =>
    fetchJson<Customer>(`${API_BASE}/customers`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateCustomer: (id: string, data: Partial<Customer>, adminName?: string) =>
    fetchJson<Customer>(`${API_BASE}/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteCustomer: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/customers/${id}`, { method: 'DELETE' }, adminName),

  // Orders & POS
  getOrders: () => fetchJson<Order[]>(`${API_BASE}/orders`),
  getOrderById: (orderId: string) => fetchJson<Order>(`${API_BASE}/orders/${orderId}`),
  createOrder: (data: any, adminName?: string) =>
    fetchJson<Order>(`${API_BASE}/orders`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  getOrderWhatsAppStatus: (orderId: string) =>
    fetchJson<{
      order_id: string;
      receipt_status: string;
      receipt_message_id?: string;
      receipt_error?: string;
      receipt_sent_at?: string;
      feedback_status: string;
      feedback_message_id?: string;
      feedback_error?: string;
      feedback_scheduled_at?: string;
      feedback_sent_at?: string;
    }>(`${API_BASE}/admin/orders/${orderId}/whatsapp/status`),
  sendOrderWhatsAppFeedback: (orderId: string) =>
    fetchJson<{ success: boolean; status: string; message_id?: string; error?: string; message?: string; already_sent?: boolean }>(
      `${API_BASE}/admin/orders/${orderId}/whatsapp/feedback`,
      { method: 'POST' }
    ),
  retryOrderWhatsApp: (orderId: string, jobType?: 'bill_receipt' | 'customer_feedback') =>
    fetchJson<{ success: boolean; status: string; message_id?: string; error?: string; message?: string }>(
      `${API_BASE}/admin/orders/${orderId}/whatsapp/retry`,
      { method: 'POST', body: JSON.stringify({ job_type: jobType }) }
    ),

  // Payments & Refunds
  getPayments: () => fetchJson<PaymentRecord[]>(`${API_BASE}/payments`),
  refundPayment: (id: string, reason: string, adminName?: string) =>
    fetchJson<PaymentRecord>(`${API_BASE}/payments/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }, adminName),

  // Products & Inventory
  getProducts: () => fetchJson<Product[]>(`${API_BASE}/products`),
  createProduct: (data: Partial<Product>, adminName?: string) =>
    fetchJson<Product>(`${API_BASE}/products`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateProduct: (id: string, data: Partial<Product>, adminName?: string) =>
    fetchJson<Product>(`${API_BASE}/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteProduct: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/products/${id}`, { method: 'DELETE' }, adminName),
  getInventoryMovements: () => fetchJson<InventoryMovement[]>(`${API_BASE}/inventory/movements`),
  recordInventoryMovement: (data: any, adminName?: string) =>
    fetchJson<InventoryMovement>(`${API_BASE}/inventory/movement`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  getSuppliers: () => fetchJson<Supplier[]>(`${API_BASE}/suppliers`),
  createSupplier: (data: Partial<Supplier>, adminName?: string) =>
    fetchJson<Supplier>(`${API_BASE}/suppliers`, { method: 'POST', body: JSON.stringify(data) }, adminName),

  // Staff
  getStaff: () => fetchJson<Staff[]>(`${API_BASE}/staff`),
  createStaff: (data: Partial<Staff>, adminName?: string) =>
    fetchJson<Staff>(`${API_BASE}/staff`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateStaff: (id: string, data: Partial<Staff>, adminName?: string) =>
    fetchJson<Staff>(`${API_BASE}/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteStaff: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/staff/${id}`, { method: 'DELETE' }, adminName),

  // Gallery
  getGallery: (onlyApproved?: boolean) => {
    const qs = onlyApproved ? '?approved=true' : '';
    return fetchJson<GalleryItem[]>(`${API_BASE}/gallery${qs}`);
  },
  createGalleryItem: (data: Partial<GalleryItem>, adminName?: string) =>
    fetchJson<GalleryItem>(`${API_BASE}/gallery`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateGalleryItem: (id: string, data: Partial<GalleryItem>, adminName?: string) =>
    fetchJson<GalleryItem>(`${API_BASE}/gallery/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteGalleryItem: (id: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/gallery/${id}`, { method: 'DELETE' }, adminName),

  // Enquiries & Reviews
  getEnquiries: () => fetchJson<Enquiry[]>(`${API_BASE}/enquiries`),
  createEnquiry: (data: Partial<Enquiry>) =>
    fetchJson<Enquiry>(`${API_BASE}/enquiries`, { method: 'POST', body: JSON.stringify(data) }),
  getReviews: () => fetchJson<Review[]>(`${API_BASE}/reviews`),
  createReview: (data: Partial<Review>) =>
    fetchJson<Review>(`${API_BASE}/reviews`, { method: 'POST', body: JSON.stringify(data) }),

  // Print Devices & Jobs
  getPrintDevices: () => fetchJson<PrintDevice[]>(`${API_BASE}/print-devices`),
  registerPrintDevice: (data: Partial<PrintDevice>) =>
    fetchJson<PrintDevice>(`${API_BASE}/print-devices/register`, { method: 'POST', body: JSON.stringify(data) }),
  getPrintJobs: () => fetchJson<PrintJob[]>(`${API_BASE}/print-jobs`),
  reprintJob: (data: { job_type: 'bill' | 'service_ticket'; order_id?: string; appointment_id?: string; payload: any }) =>
    fetchJson<PrintJob>(`${API_BASE}/print-jobs/reprint`, { method: 'POST', body: JSON.stringify(data) }),
  updatePrintJobStatus: (id: string, status: string) =>
    fetchJson<PrintJob>(`${API_BASE}/print-jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Reports & Audit Logs
  getReports: () => fetchJson<any>(`${API_BASE}/reports`),
  getDetailedReports: (filter?: SalesReportFilter) => {
    const params = new URLSearchParams();
    if (filter?.period) params.append('period', filter.period);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<DetailedSalesReport>(`${API_BASE}/reports/detailed${qs}`);
  },
  getAuditLogs: () => fetchJson<AuditLog[]>(`${API_BASE}/audit-logs`),

  // WhatsApp Business Coexistence Integration (Legacy Global)
  getWhatsAppStatus: () =>
    fetchJson<WhatsAppStatusResponse>(`${API_BASE}/admin/whatsapp/status`),
  connectWhatsApp: (data: { waba_id?: string; phone_number_id?: string; code?: string; display_name?: string; display_phone_number?: string }, adminName?: string) =>
    fetchJson<{
      success: boolean;
      message?: string;
      diagnostics?: string;
      integration: WhatsAppIntegration;
      selection_required?: boolean;
      candidates?: Array<{ waba_id: string; phone_number_id: string; display_phone_number?: string; verified_name?: string }>;
    }>(`${API_BASE}/admin/whatsapp/connect`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  disconnectWhatsApp: (adminName?: string) =>
    fetchJson<{ success: boolean; message: string; integration: WhatsAppIntegration }>(`${API_BASE}/admin/whatsapp/disconnect`, { method: 'POST' }, adminName),
  updateWhatsAppSettings: (data: Partial<WhatsAppBusinessSettings>, adminName?: string) =>
    fetchJson<{ success: boolean; message: string; settings: WhatsAppBusinessSettings }>(`${API_BASE}/admin/whatsapp/settings`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  testWhatsAppConnection: (adminName?: string) =>
    fetchJson<{ success: boolean; message: string; diagnostics?: string; integration: WhatsAppIntegration }>(`${API_BASE}/admin/whatsapp/test`, { method: 'POST' }, adminName),

  // Multi-Branch Management (Owner & Assigned Branch Manager)
  getBranches: () =>
    fetchJson<SalonBranch[]>(`${API_BASE}/branches`).catch(() => fetchJson<SalonBranch[]>(`${API_BASE}/admin/branches`)),
  getBranchById: (branchId: string) =>
    fetchJson<SalonBranch>(`${API_BASE}/admin/branches/${branchId}`),
  createBranch: (data: Partial<SalonBranch>, adminName?: string) =>
    fetchJson<SalonBranch>(`${API_BASE}/admin/branches`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  updateBranch: (branchId: string, data: Partial<SalonBranch>, adminName?: string) =>
    fetchJson<SalonBranch>(`${API_BASE}/admin/branches/${branchId}`, { method: 'PATCH', body: JSON.stringify(data) }, adminName),
  deleteBranch: (branchId: string, adminName?: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/admin/branches/${branchId}`, { method: 'DELETE' }, adminName),

  // Multi-Branch WhatsApp Business Coexistence Onboarding
  getBranchWhatsAppStatus: (branchId: string) =>
    fetchJson<BranchWhatsAppStatusResponse>(`${API_BASE}/admin/branches/${branchId}/whatsapp/status`),
  updateBranchWhatsAppSettings: (branchId: string, data: { whatsapp_number: string; display_name?: string }, adminName?: string) =>
    fetchJson<{ success: boolean; message: string; branch: SalonBranch }>(`${API_BASE}/admin/branches/${branchId}/whatsapp/settings`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  startBranchWhatsAppPairing: (branchId: string, adminName?: string) =>
    fetchJson<{ success: boolean; integration: BranchWhatsAppIntegration }>(`${API_BASE}/admin/branches/${branchId}/whatsapp/pairing`, { method: 'POST' }, adminName),
  connectBranchWhatsApp: (branchId: string, data: { waba_id?: string; phone_number_id?: string; code?: string; display_name?: string; display_phone_number?: string }, adminName?: string) =>
    fetchJson<{
      success: boolean;
      message?: string;
      diagnostics?: string;
      integration: BranchWhatsAppIntegration;
      selection_required?: boolean;
      candidates?: Array<{ waba_id: string; phone_number_id: string; display_phone_number?: string; verified_name?: string }>;
    }>(`${API_BASE}/admin/branches/${branchId}/whatsapp/connect`, { method: 'POST', body: JSON.stringify(data) }, adminName),
  testBranchWhatsApp: (branchId: string, adminName?: string) =>
    fetchJson<{ success: boolean; message: string; diagnostics?: string; integration: BranchWhatsAppIntegration }>(`${API_BASE}/admin/branches/${branchId}/whatsapp/test`, { method: 'POST' }, adminName),
  disconnectBranchWhatsApp: (branchId: string, adminName?: string) =>
    fetchJson<{ success: boolean; message: string; integration: BranchWhatsAppIntegration }>(`${API_BASE}/admin/branches/${branchId}/whatsapp/disconnect`, { method: 'POST' }, adminName),

  // Real WhatsApp Automated Messaging & Feedback
  getWhatsAppMessageLogs: (appointmentId?: string, branchId?: string) => {
    const params = new URLSearchParams();
    if (appointmentId) params.append('appointment_id', appointmentId);
    if (branchId) params.append('branch_id', branchId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<WhatsAppMessageLog[]>(`${API_BASE}/admin/whatsapp/message-logs${qs}`);
  },
  getAppointmentFeedback: (branchId?: string) => {
    const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return fetchJson<AppointmentFeedback[]>(`${API_BASE}/admin/whatsapp/feedback${qs}`);
  },
  markFeedbackRead: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/admin/whatsapp/feedback/${id}/read`, { method: 'POST' }),
  getScheduledFeedbackJobs: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson<ScheduledFeedbackJob[]>(`${API_BASE}/admin/whatsapp/scheduled-jobs${qs}`);
  },
  sendWhatsAppTestTemplate: (data: { branch_id?: string; recipient: string; template_name: string }) =>
    fetchJson<{
      success: boolean;
      status: string;
      message_id?: string;
      error?: string;
      diagnostics?: string;
      log?: WhatsAppMessageLog;
    }>(`${API_BASE}/admin/whatsapp/test-send`, { method: 'POST', body: JSON.stringify(data) }),
  simulateWhatsAppFeedbackReply: (data: { phone: string; rating: string; text?: string; appointment_id?: string }) =>
    fetchJson<{
      success: boolean;
      message?: string;
      feedback?: AppointmentFeedback;
      auto_reply_sent?: string;
      alert_generated?: boolean;
    }>(`${API_BASE}/webhook/simulate-feedback-reply`, { method: 'POST', body: JSON.stringify(data) }),
  sendAppointmentWhatsAppConfirmation: (appointmentId: string, force?: boolean) =>
    fetchJson<{
      success: boolean;
      warning?: string;
      duplicate_prevented?: boolean;
      last_sent_at?: string;
      message?: string;
      status?: string;
      message_id?: string;
      error?: string;
      diagnostics?: string;
      log?: WhatsAppMessageLog;
      appointment?: Appointment;
    }>(`${API_BASE}/admin/appointments/${appointmentId}/whatsapp/confirm`, {
      method: 'POST',
      body: JSON.stringify({ force: !!force })
    })
};
