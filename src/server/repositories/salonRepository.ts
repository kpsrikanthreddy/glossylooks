/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Clean Repository Interface for The Glossy Looks Salon Management System
 * Decouples database implementation (Supabase, PostgreSQL, SQLite, or File-backed DB)
 * from API route handlers and business logic.
 */

import type {
  User,
  Customer,
  OTPSession,
  Staff,
  StaffAvailability,
  ServiceCategory,
  ServiceItem,
  ServiceAddOn,
  PackageCombo,
  Appointment,
  Order,
  PaymentRecord,
  Product,
  Supplier,
  PurchaseOrder,
  InventoryMovement,
  GalleryItem,
  Enquiry,
  Offer,
  Review,
  PrintDevice,
  PrintJob,
  SalonSettings,
  AuditLog,
  DetailedSalesReport,
  SalesReportFilter,
  WhatsAppIntegration,
  WhatsAppBusinessSettings,
  SalonBranch,
  BranchWhatsAppIntegration,
  WhatsAppMessageLog,
  AppointmentFeedback,
  ScheduledFeedbackJob,
  ProcessedWebhookEvent
} from '../../types/salon.ts';

export interface ISalonRepository {
  // Branches (Multi-Branch Coexistence)
  getBranches(): Promise<SalonBranch[]>;
  getBranchById(id: string): Promise<SalonBranch | null>;
  createBranch(branch: Omit<SalonBranch, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<SalonBranch>;
  updateBranch(id: string, data: Partial<SalonBranch>, performedBy: string): Promise<SalonBranch | null>;
  deleteBranch(id: string, performedBy: string): Promise<boolean>;

  // Branch WhatsApp Coexistence Integrations
  getBranchWhatsAppIntegration(branchId: string): Promise<BranchWhatsAppIntegration>;
  updateBranchWhatsAppIntegration(branchId: string, data: Partial<BranchWhatsAppIntegration>, performedBy: string): Promise<BranchWhatsAppIntegration>;
  disconnectBranchWhatsAppIntegration(branchId: string, performedBy: string): Promise<BranchWhatsAppIntegration>;

  // Settings & WhatsApp Integration (Legacy Global)
  getSettings(): Promise<SalonSettings>;
  updateSettings(data: Partial<SalonSettings>, performedBy: string): Promise<SalonSettings>;
  getWhatsAppIntegration(): Promise<WhatsAppIntegration>;
  updateWhatsAppIntegration(data: Partial<WhatsAppIntegration>, performedBy: string): Promise<WhatsAppIntegration>;
  disconnectWhatsAppIntegration(performedBy: string): Promise<WhatsAppIntegration>;
  getWhatsAppBusinessSettings(): Promise<WhatsAppBusinessSettings>;
  updateWhatsAppBusinessSettings(settings: Partial<WhatsAppBusinessSettings>, performedBy: string): Promise<WhatsAppBusinessSettings>;

  // Users & Staff
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByIdentifier(identifier: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<User>;
  updateUser(id: string, data: Partial<User>, performedBy: string): Promise<User | null>;
  resetUserPassword(id: string, newPassword: string, performedBy: string): Promise<boolean>;
  deleteUser(id: string, performedBy: string): Promise<boolean>;

  getStaff(): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | null>;
  createStaff(staff: Omit<Staff, 'id' | 'created_at'>, performedBy: string): Promise<Staff>;
  updateStaff(id: string, data: Partial<Staff>, performedBy: string): Promise<Staff | null>;
  deleteStaff(id: string, performedBy: string): Promise<boolean>;

  // Customer & Auth
  createOTPSession(mobile: string): Promise<{ sessionId: string; otp: string }>;
  verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; customer: Customer; token: string }>;
  getCustomers(search?: string): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  getCustomerByMobile(mobile: string): Promise<Customer | null>;
  createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>, performedBy: string): Promise<Customer | null>;
  deleteCustomer(id: string, performedBy: string): Promise<boolean>;

  // Categories & Services & Packages
  getCategories(): Promise<ServiceCategory[]>;
  createCategory(cat: Omit<ServiceCategory, 'id'>, performedBy: string): Promise<ServiceCategory>;
  updateCategory(id: string, cat: Partial<ServiceCategory>, performedBy: string): Promise<ServiceCategory | null>;
  deleteCategory(id: string, performedBy: string): Promise<boolean>;

  getServices(categoryId?: string, search?: string): Promise<ServiceItem[]>;
  getServiceById(id: string): Promise<ServiceItem | null>;
  createService(srv: Omit<ServiceItem, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<ServiceItem>;
  updateService(id: string, srv: Partial<ServiceItem>, performedBy: string): Promise<ServiceItem | null>;
  deleteService(id: string, performedBy: string): Promise<boolean>;

  getPackages(): Promise<PackageCombo[]>;
  createPackage(pkg: Omit<PackageCombo, 'id'>, performedBy: string): Promise<PackageCombo>;
  updatePackage(id: string, pkg: Partial<PackageCombo>, performedBy: string): Promise<PackageCombo | null>;
  deletePackage(id: string, performedBy: string): Promise<boolean>;

  // Appointments
  getAppointments(filters?: { status?: string; staffId?: string; customerMobile?: string }): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  createAppointment(apt: Omit<Appointment, 'id' | 'booking_reference' | 'created_at' | 'updated_at'>, performedBy?: string): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<Appointment>, performedBy: string): Promise<Appointment | null>;
  cancelAppointment(id: string, reason: string, performedBy: string): Promise<Appointment | null>;

  // Orders & POS Invoicing
  getOrders(filters?: { customerMobile?: string; paymentStatus?: string }): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  createOrder(orderData: Omit<Order, 'id' | 'bill_number' | 'created_at'>, performedBy: string): Promise<Order>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | null>;
  updateOrderStatus(id: string, status: Order['payment_status'], performedBy: string): Promise<Order | null>;

  // Payments & Refunds
  getPayments(): Promise<PaymentRecord[]>;
  recordPayment(payment: Omit<PaymentRecord, 'id' | 'created_at'>, performedBy: string): Promise<PaymentRecord>;
  refundPayment(id: string, reason: string, performedBy: string): Promise<PaymentRecord | null>;

  // Inventory Products, Suppliers & Movements
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(prod: Omit<Product, 'id' | 'updated_at'>, performedBy: string): Promise<Product>;
  updateProduct(id: string, prod: Partial<Product>, performedBy: string): Promise<Product | null>;
  deleteProduct(id: string, performedBy: string): Promise<boolean>;
  recordInventoryMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>, performedBy: string): Promise<InventoryMovement>;
  getInventoryMovements(): Promise<InventoryMovement[]>;

  getSuppliers(): Promise<Supplier[]>;
  createSupplier(sup: Omit<Supplier, 'id' | 'created_at'>, performedBy: string): Promise<Supplier>;

  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'created_at'>, performedBy: string): Promise<PurchaseOrder>;

  // Gallery Portfolio
  getGallery(onlyApproved?: boolean): Promise<GalleryItem[]>;
  createGalleryItem(item: Omit<GalleryItem, 'id' | 'created_at'>, performedBy: string): Promise<GalleryItem>;
  updateGalleryItem(id: string, item: Partial<GalleryItem>, performedBy: string): Promise<GalleryItem | null>;
  deleteGalleryItem(id: string, performedBy: string): Promise<boolean>;

  // Enquiries & Reviews
  getEnquiries(): Promise<Enquiry[]>;
  createEnquiry(enquiry: Omit<Enquiry, 'id' | 'created_at'>): Promise<Enquiry>;
  getReviews(): Promise<Review[]>;
  createReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review>;

  // Print Devices & Print Queue
  getPrintDevices(): Promise<PrintDevice[]>;
  registerPrintDevice(device: Partial<PrintDevice>): Promise<PrintDevice>;
  updateDeviceHeartbeat(deviceId: string): Promise<void>;
  getPrintJobs(deviceId?: string): Promise<PrintJob[]>;
  queuePrintJob(job: { device_id: string; job_type: 'bill' | 'service_ticket'; order_id?: string; appointment_id?: string; payload: any }): Promise<PrintJob>;
  updatePrintJobStatus(id: string, status: PrintJob['status']): Promise<PrintJob | null>;

  // Audit Logs & Reports
  getAuditLogs(): Promise<AuditLog[]>;
  logAudit(action: string, entity: string, entityId: string, performedBy: string, details: string): Promise<AuditLog>;
  getReports(): Promise<any>;
  getDetailedReports(filter?: SalesReportFilter): Promise<DetailedSalesReport>;

  // WhatsApp Message Logs
  getWhatsAppMessageLogs(appointmentId?: string, branchId?: string): Promise<WhatsAppMessageLog[]>;
  createWhatsAppMessageLog(log: Omit<WhatsAppMessageLog, 'id' | 'created_at' | 'updated_at'>): Promise<WhatsAppMessageLog>;
  updateWhatsAppMessageLog(id: string, data: Partial<WhatsAppMessageLog>): Promise<WhatsAppMessageLog | null>;
  updateWhatsAppMessageLogByMetaId(metaMessageId: string, data: Partial<WhatsAppMessageLog>): Promise<WhatsAppMessageLog | null>;
  getDueWhatsAppMessageRetries(): Promise<WhatsAppMessageLog[]>;

  // Customer Feedback
  getAppointmentFeedback(branchId?: string): Promise<AppointmentFeedback[]>;
  createAppointmentFeedback(feedback: Omit<AppointmentFeedback, 'id' | 'received_at'>): Promise<AppointmentFeedback>;
  markFeedbackAsRead(id: string): Promise<boolean>;

  // Durable Scheduled Feedback Jobs
  getScheduledFeedbackJobs(status?: string): Promise<ScheduledFeedbackJob[]>;
  getDueScheduledFeedbackJobs(): Promise<ScheduledFeedbackJob[]>;
  createScheduledFeedbackJob(job: Omit<ScheduledFeedbackJob, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledFeedbackJob>;
  updateScheduledFeedbackJob(id: string, data: Partial<ScheduledFeedbackJob>): Promise<ScheduledFeedbackJob | null>;
  cancelScheduledFeedbackJobByAppointment(appointmentId: string): Promise<boolean>;
  cancelScheduledFeedbackJobByOrder(orderId: string): Promise<boolean>;

  // Webhook Event Idempotency
  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  recordProcessedWebhookEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent>;
}
