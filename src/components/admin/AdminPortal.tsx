/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Complete The Glossy Looks Admin & Salon Operations Portal
 * Role-Based Access Control (RBAC), Protected Login, Full 11 CRUD Modules,
 * POS Billing, CRM, Inventory Movements, Print Provider & Audit Logging.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Receipt, 
  CreditCard, 
  Package, 
  UserCheck, 
  BarChart3, 
  Printer, 
  Settings, 
  Sparkles, 
  Search, 
  Plus, 
  Filter, 
  Check, 
  Clock, 
  AlertTriangle, 
  ArrowLeft, 
  ChevronRight, 
  Download, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Eye, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Lock,
  LogOut,
  Image as ImageIcon,
  Truck,
  RotateCcw,
  Key,
  ShieldAlert,
  FileSpreadsheet,
  CalendarRange,
  EyeOff,
  UserPlus,
  Shield,
  MessageSquare,
  ShoppingCart,
  X,
  Minus,
  MapPin,
  Loader2,
  CheckCheck
} from 'lucide-react';
import { WhatsAppIntegrationSection } from './WhatsAppIntegrationSection';
import { 
  AdminUser, 
  AdminRole, 
  Appointment, 
  Customer, 
  Order, 
  PaymentRecord, 
  Product, 
  Supplier, 
  InventoryMovement, 
  Staff, 
  PrintDevice, 
  PrintJob, 
  ServiceCategory, 
  ServiceItem, 
  PackageCombo, 
  SalonSettings, 
  GalleryItem, 
  User, 
  AuditLog,
  DetailedSalesReport,
  SalesReportFilter,
  WhatsAppMessageLog,
  AppointmentFeedback,
  SalonBranch
} from '../../types/salon';
import { api } from '../../lib/api';

interface AdminPortalProps {
  onBackToWebsite: () => void;
  onViewReceipt: (order?: Order, apt?: Appointment, type?: 'bill' | 'service_ticket') => void;
}

const PRESET_ACCOUNTS = [
  { identifier: 'TGL-OWN01', email: 'owner@theglossylooks.com', mobile: '8985799459', password: 'admin123', role: 'owner', name: 'Madu Mounika' }
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToWebsite, onViewReceipt }) => {
  // Authentication & Session - Read strictly from local session storage; null by default when unauthenticated
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('the_glossy_looks_admin_session') || localStorage.getItem('the_glossy_looks_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user) {
          // If cached user has old sample name "Priya Sharma" or matches owner ID, sanitize to real owner "Madu Mounika"
          if (parsed.user.name === 'Priya Sharma' || parsed.user.user_id === 'TGL-OWN01' || parsed.user.email === 'owner@theglossylooks.com') {
            parsed.user.name = 'Madu Mounika';
            parsed.user.user_id = 'TGL-OWN01';
            parsed.user.email = 'owner@theglossylooks.com';
            parsed.user.phone = '8985799459';
            try {
              sessionStorage.setItem('the_glossy_looks_admin_session', JSON.stringify(parsed));
              localStorage.setItem('the_glossy_looks_admin_session', JSON.stringify(parsed));
            } catch {}
          }
          return parsed.user;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [loginIdentifier, setLoginIdentifier] = useState('TGL-OWN01');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active module navigation
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'customers' | 'appointments' | 'services' | 'gallery' | 'inventory' | 'pos' | 'payments' | 'staff' | 'reports' | 'printers' | 'settings'
  >('dashboard');

  // Sub-navigation for Settings module (Owner only)
  const [settingsSubTab, setSettingsSubTab] = useState<'whatsapp' | 'users' | 'audit'>('whatsapp');

  // Server data states
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [printDevices, setPrintDevices] = useState<PrintDevice[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageCombo[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [reports, setReports] = useState<any>(null);
  const defaultBranchFallback: SalonBranch = {
    id: 'tgl-gachibowli-main',
    name: 'Gachibowli Main Flagship',
    code: 'GCB-01',
    address: '31, Vinayak Nagar, Gachibowli',
    city: 'Hyderabad, Telangana - 500032',
    phone: '8985799459',
    whatsapp_number: '8985799459',
    is_active: true,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-10-31T09:09:41.008Z'
  };
  const defaultKondapurBranch: SalonBranch = {
    id: 'brn-1793346038689',
    name: 'Kondapur Branch',
    code: 'KND-02',
    address: 'Road No 2, Kondapur',
    city: 'Hyderabad, Telangana - 500084',
    phone: '9491914422',
    whatsapp_number: '9491914422',
    is_active: true,
    created_at: '2026-10-30T07:40:38.689Z',
    updated_at: '2026-10-30T07:40:38.689Z'
  };
  const [branches, setBranches] = useState<SalonBranch[]>([defaultBranchFallback, defaultKondapurBranch]);

  // Detailed Sales Report & Date Range Filters
  const [detailedReports, setDetailedReports] = useState<DetailedSalesReport | null>(null);
  const [reportFilterPeriod, setReportFilterPeriod] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-27');
  const [loadingReports, setLoadingReports] = useState(false);

  // Owner RBAC Modals
  const [userModal, setUserModal] = useState<{ isOpen: boolean; data?: User | null }>({ isOpen: false });
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean; user?: User | null }>({ isOpen: false });
  const [deactivateConfirmModal, setDeactivateConfirmModal] = useState<{ isOpen: boolean; user?: User | null; action?: 'toggle' | 'delete' }>({ isOpen: false });

  // Search & Filter filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [appointmentBranchFilter, setAppointmentBranchFilter] = useState('all');

  // POS State
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posSelectedItems, setPosSelectedItems] = useState<Array<{ service: ServiceItem; quantity: number; staffId?: string }>>([]);
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posTip, setPosTip] = useState<number>(0);
  const [posPaymentMode, setPosPaymentMode] = useState<Order['primary_payment_mode'] | ''>('UPI');
  const [posBranchId, setPosBranchId] = useState('tgl-gachibowli-main');
  const [posNotes, setPosNotes] = useState('');
  const [posSuccessOrder, setPosSuccessOrder] = useState<Order | null>(null);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [posBillingStatus, setPosBillingStatus] = useState<string | null>(null);
  const [posBillingError, setPosBillingError] = useState<string | null>(null);
  const [posFeedbackSending, setPosFeedbackSending] = useState(false);
  const [posFeedbackStatus, setPosFeedbackStatus] = useState<'sent' | 'queued' | 'failed' | null>(null);
  const [posFeedbackMessage, setPosFeedbackMessage] = useState<string | null>(null);
  const [posRetryingReceipt, setPosRetryingReceipt] = useState(false);
  const [posRetryingFeedback, setPosRetryingFeedback] = useState(false);
  const [posIdempotencyKey, setPosIdempotencyKey] = useState<string>(() => `pos-idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [posSearch, setPosSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posSalonGroup, setPosSalonGroup] = useState<string>('all');
  const [posSalonSubcategory, setPosSalonSubcategory] = useState<string>('');
  const [isPosCartOpen, setIsPosCartOpen] = useState(false);
  const posBranchRef = useRef<HTMLSelectElement>(null);
  const posCustomerNameRef = useRef<HTMLInputElement>(null);
  const posCustomerPhoneRef = useRef<HTMLInputElement>(null);
  const posPaymentModeRef = useRef<HTMLSelectElement>(null);

  // Modals for CRUD operations
  const [customerModal, setCustomerModal] = useState<{ isOpen: boolean; data?: Customer | null }>({ isOpen: false });
  const [serviceModal, setServiceModal] = useState<{ isOpen: boolean; data?: ServiceItem | null }>({ isOpen: false });
  const [productModal, setProductModal] = useState<{ isOpen: boolean; data?: Product | null }>({ isOpen: false });
  const [stockMovementModal, setStockMovementModal] = useState<{ isOpen: boolean; product?: Product | null }>({ isOpen: false });
  const [staffModal, setStaffModal] = useState<{ isOpen: boolean; data?: Staff | null }>({ isOpen: false });
  const [galleryModal, setGalleryModal] = useState<{ isOpen: boolean; data?: GalleryItem | null }>({ isOpen: false });

  // Stock movement state
  const [stockType, setStockType] = useState<InventoryMovement['movement_type']>('stock_in');
  const [stockQty, setStockQty] = useState(1);
  const [stockNotes, setStockNotes] = useState('');

  // WhatsApp Confirmation & Feedback State
  const [whatsAppConfirmModal, setWhatsAppConfirmModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    force?: boolean;
  }>({ isOpen: false, appointment: null });
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppSendResult, setWhatsAppSendResult] = useState<{
    success: boolean;
    warning?: string;
    duplicate_prevented?: boolean;
    last_sent_at?: string;
    message?: string;
    status?: string;
    message_id?: string;
    error?: string;
    diagnostics?: string;
  } | null>(null);

  const [appointmentLogsModal, setAppointmentLogsModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    logs: WhatsAppMessageLog[];
    loading: boolean;
  }>({ isOpen: false, appointment: null, logs: [], loading: false });

  const [feedbackList, setFeedbackList] = useState<AppointmentFeedback[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Asia/Kolkata (IST) Date Formatting & Comparison Helpers
  const getKolkataDateString = (dateInput?: string | Date): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  const formatKolkataDateTime = (dateInput?: string | Date): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  };

  // Payment Ledger & Order Management State
  const [ledgerDateFilter, setLedgerDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState(() => getKolkataDateString());
  const [ledgerEndDate, setLedgerEndDate] = useState(() => getKolkataDateString());
  const [ledgerBranchFilter, setLedgerBranchFilter] = useState('all');
  const [ledgerModeFilter, setLedgerModeFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Order Details & Edit Modals
  const [orderDetailsModal, setOrderDetailsModal] = useState<{
    isOpen: boolean;
    order?: Order | null;
    payment?: PaymentRecord | null;
  }>({ isOpen: false, order: null, payment: null });

  const [orderEditModal, setOrderEditModal] = useState<{
    isOpen: boolean;
    order?: Order | null;
    payment?: PaymentRecord | null;
  }>({ isOpen: false, order: null, payment: null });
  const [orderEditSaving, setOrderEditSaving] = useState(false);
  const [orderEditError, setOrderEditError] = useState<string | null>(null);
  const [editOrderDiscount, setEditOrderDiscount] = useState<number>(0);
  const [editOrderPaymentMode, setEditOrderPaymentMode] = useState<Order['primary_payment_mode']>('Cash');
  const [editOrderPaymentStatus, setEditOrderPaymentStatus] = useState<Order['payment_status']>('Paid');
  const [editOrderCustomerName, setEditOrderCustomerName] = useState('');
  const [editOrderCustomerPhone, setEditOrderCustomerPhone] = useState('');
  const [editOrderNotes, setEditOrderNotes] = useState('');

  const loadDetailedReports = async (period: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom', start?: string, end?: string) => {
    try {
      setLoadingReports(true);
      const res = await api.getDetailedReports({
        period,
        startDate: period === 'custom' ? start : undefined,
        endDate: period === 'custom' ? end : undefined
      });
      setDetailedReports(res);
    } catch (err) {
      console.error('Failed to load detailed reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const isOwnerRole = currentUser?.role === 'owner';
      const isManagerOrOwner = ['owner', 'manager'].includes(currentUser?.role || '');

      const [
        aptsData,
        custsData,
        ordersData,
        paymentsData,
        prodsData,
        supsData,
        movsData,
        staffData,
        devsData,
        jobsData,
        catsData,
        srvsData,
        pkgsData,
        galleryData,
        settingsData,
        branchesData
      ] = await Promise.all([
        api.getAppointments(),
        api.getCustomers(),
        api.getOrders(),
        api.getPayments(),
        api.getProducts(),
        api.getSuppliers(),
        api.getInventoryMovements(),
        api.getStaff(),
        api.getPrintDevices(),
        api.getPrintJobs(),
        api.getCategories(),
        api.getServices(),
        api.getPackages(),
        api.getGallery(false),
        api.getSettings(),
        api.getBranches().catch(() => [])
      ]);

      setAppointments(aptsData);
      setCustomers(custsData);
      setOrders(ordersData);
      setPayments(paymentsData);
      setProducts(prodsData);
      setSuppliers(supsData);
      setMovements(movsData);
      setStaffList(staffData);
      setPrintDevices(devsData);
      setPrintJobs(jobsData);
      setCategories(catsData);
      setServices(srvsData);
      setPackages(pkgsData);
      setGallery(galleryData);
      setSettings(settingsData);
      const activeBranches = (branchesData || []).filter(branch => branch.is_active !== false);
      const hasKondapur = activeBranches.some(b => b.id === 'brn-1793346038689' || b.name.toLowerCase().includes('kondapur'));
      const finalBranches = activeBranches.length > 0 
        ? (hasKondapur ? activeBranches : [...activeBranches, defaultKondapurBranch])
        : [defaultBranchFallback, defaultKondapurBranch];
      setBranches(finalBranches);
      setPosBranchId(prev => prev || finalBranches[0].id);

      // Role-gated fetches: Users & Audit logs ONLY for Owner
      if (isOwnerRole) {
        try {
          const [usersData, logsData] = await Promise.all([
            api.getAdminUsers(),
            api.getAuditLogs()
          ]);
          setAdminUsers(usersData);
          setAuditLogs(logsData);
        } catch (e) {
          console.warn('Could not load owner records:', e);
        }
      }

      // Role-gated fetches: Reports & Feedback ONLY for Owner & Manager
      if (isManagerOrOwner) {
        try {
          const [reportsData, fbData] = await Promise.all([
            api.getReports(),
            api.getAppointmentFeedback().catch(() => [])
          ]);
          setReports(reportsData);
          setFeedbackList(fbData || []);
          await loadDetailedReports(reportFilterPeriod, customStartDate, customEndDate);
        } catch (e) {
          console.warn('Could not load reports or feedback:', e);
        }
      }

      // Refresh current user identity from master server single source of truth
      try {
        const me = await api.getAdminMe();
        if (me && me.name && (me.name !== currentUser?.name || me.user_id !== currentUser?.user_id || me.role !== currentUser?.role)) {
          setCurrentUser(me);
          const saved = sessionStorage.getItem('the_glossy_looks_admin_session') || localStorage.getItem('the_glossy_looks_admin_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.user = me;
            sessionStorage.setItem('the_glossy_looks_admin_session', JSON.stringify(parsed));
            localStorage.setItem('the_glossy_looks_admin_session', JSON.stringify(parsed));
          }
        }
      } catch {
        // Not authenticated or session expired
      }
    } catch (err) {
      console.error('Error loading admin records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await api.loginAdmin(loginIdentifier.trim(), loginPassword);
      sessionStorage.setItem('the_glossy_looks_admin_session', JSON.stringify({ token: res.token, user: res.user }));
      localStorage.setItem('the_glossy_looks_admin_session', JSON.stringify({ token: res.token, user: res.user }));
      setCurrentUser(res.user);
      
      // Auto-route to role module
      if (res.user.role === 'receptionist') setActiveTab('pos');
      else if (res.user.role === 'stylist') setActiveTab('appointments');
      else if (res.user.role === 'inventory_staff') setActiveTab('inventory');
      else setActiveTab('dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials or account deactivated.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('the_glossy_looks_admin_session');
    localStorage.removeItem('the_glossy_looks_admin_session');
    setCurrentUser(null);
  };

  const handleOpenWhatsAppConfirm = (apt: Appointment) => {
    setWhatsAppConfirmModal({ isOpen: true, appointment: apt, force: false });
    setWhatsAppSendResult(null);
  };

  const handleSendWhatsAppConfirm = async (force: boolean = false) => {
    if (!whatsAppConfirmModal.appointment) return;
    const aptId = whatsAppConfirmModal.appointment.id;
    setWhatsAppSending(true);
    setWhatsAppSendResult(null);
    try {
      const res = await api.sendAppointmentWhatsAppConfirmation(aptId, force);
      setWhatsAppSendResult(res);
      if (res.success || res.status) {
        const updatedApts = await api.getAppointments();
        setAppointments(updatedApts);
      }
    } catch (err: any) {
      setWhatsAppSendResult({
        success: false,
        error: err.message || 'Failed to send WhatsApp confirmation'
      });
    } finally {
      setWhatsAppSending(false);
    }
  };

  const handleViewAppointmentLogs = async (apt: Appointment) => {
    setAppointmentLogsModal({ isOpen: true, appointment: apt, logs: [], loading: true });
    try {
      const logs = await api.getWhatsAppMessageLogs(apt.id);
      setAppointmentLogsModal(prev => ({ ...prev, logs, loading: false }));
    } catch (err) {
      console.warn('Could not load message logs for appointment:', err);
      setAppointmentLogsModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Role Permissions
  const role = currentUser?.role || 'staff';
  const isOwner = role === 'owner';
  const isManager = ['owner', 'manager'].includes(role);
  const isReceptionist = ['owner', 'manager', 'receptionist'].includes(role);
  const isInventoryStaff = ['owner', 'manager', 'inventory_staff'].includes(role);
  const isStylist = role === 'stylist';

  // POS Checkout Handler
  const handlePosCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingBill) return; // Prevent double clicks / concurrent bill creation

    if (!posBranchId) {
      posBranchRef.current?.focus();
      posBranchRef.current?.reportValidity();
      return;
    }
    if (!posCustomerName.trim()) {
      posCustomerNameRef.current?.focus();
      posCustomerNameRef.current?.reportValidity();
      return;
    }
    if (!posCustomerPhone.trim()) {
      posCustomerPhoneRef.current?.focus();
      posCustomerPhoneRef.current?.reportValidity();
      return;
    }
    if (!posPaymentMode) {
      posPaymentModeRef.current?.focus();
      posPaymentModeRef.current?.reportValidity();
      return;
    }
    if (posSelectedItems.length === 0) {
      alert('Please add at least one service or product to the bill.');
      return;
    }

    const items = posSelectedItems.map(item => {
      const staffMember = staffList.find(s => s.id === item.staffId);
      const unitPrice = item.service.discount_price || item.service.price;
      const total = unitPrice * item.quantity;
      const commission = total * ((staffMember?.commission_rate || 10) / 100);
      return {
        service_id: item.service.id,
        item_name: item.service.name,
        item_type: 'service' as const,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: total,
        staff_id: item.staffId,
        staff_name: staffMember?.name || 'Stylist',
        commission_amount: commission
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
    const tax = Math.round(subtotal * 0.05);
    const grandTotal = Math.max(0, subtotal - posDiscount + tax + posTip);

    // 1. Immediately disable button, show spinner, and show status toast
    setIsGeneratingBill(true);
    setPosBillingStatus('Creating bill. Please wait…');
    setPosBillingError(null);
    setPosFeedbackMessage(null);
    setPosFeedbackStatus(null);

    try {
      const newOrder = await api.createOrder({
        idempotency_key: posIdempotencyKey,
        customer_name: posCustomerName,
        customer_phone: posCustomerPhone,
        branch_id: posBranchId,
        items,
        subtotal,
        discount: posDiscount,
        tax_amount: tax,
        tip_amount: posTip,
        grand_total: grandTotal,
        paid_amount: grandTotal,
        payment_status: 'Paid',
        primary_payment_mode: posPaymentMode as Order['primary_payment_mode'],
        cashier_name: currentUser?.name || 'Reception',
        notes: posNotes
      }, currentUser?.name);

      setPosSuccessOrder(newOrder);
      setPosBillingStatus(null);
      // Generate new idempotency key for next bill attempt
      setPosIdempotencyKey(`pos-idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      loadAllData();
    } catch (err: any) {
      setPosBillingStatus(null);
      setPosBillingError(err.message || 'Error executing POS bill. Please check inputs and retry.');
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const handleResetPosForm = () => {
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosSelectedItems([]);
    setPosDiscount(0);
    setPosTip(0);
    setPosNotes('');
    setPosSuccessOrder(null);
    setPosBillingStatus(null);
    setPosBillingError(null);
    setPosFeedbackMessage(null);
    setPosFeedbackStatus(null);
    setPosIdempotencyKey(`pos-idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setIsPosCartOpen(false);
  };

  // Live polling for WhatsApp delivery status updates while bill dialog is displayed
  useEffect(() => {
    if (!posSuccessOrder?.id) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const statusRes = await api.getOrderWhatsAppStatus(posSuccessOrder.id);
        if (isMounted && statusRes && statusRes.order_id === posSuccessOrder.id) {
          setPosSuccessOrder(prev => {
            if (!prev || prev.id !== statusRes.order_id) return prev;
            if (
              prev.receipt_whatsapp_status === statusRes.receipt_status &&
              prev.feedback_whatsapp_status === statusRes.feedback_status
            ) {
              return prev;
            }
            return {
              ...prev,
              receipt_whatsapp_status: statusRes.receipt_status as any,
              receipt_whatsapp_message_id: statusRes.receipt_message_id,
              receipt_whatsapp_error: statusRes.receipt_error,
              receipt_whatsapp_sent_at: statusRes.receipt_sent_at,
              feedback_whatsapp_status: statusRes.feedback_status as any,
              feedback_whatsapp_message_id: statusRes.feedback_message_id,
              feedback_whatsapp_error: statusRes.feedback_error,
              feedback_whatsapp_scheduled_at: statusRes.feedback_scheduled_at,
              feedback_whatsapp_sent_at: statusRes.feedback_sent_at,
              whatsapp_status: statusRes.receipt_status as any
            };
          });
        }
      } catch {
        // Background poll quiet fail
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [posSuccessOrder?.id]);

  const handleSendPosFeedback = async () => {
    if (!posSuccessOrder) {
      setPosFeedbackMessage('Generate the bill first, then send customer feedback.');
      return;
    }

    // Check if feedback is already sent/delivered to avoid duplicate messages
    if (
      posSuccessOrder.feedback_whatsapp_status === 'sent' ||
      posSuccessOrder.feedback_whatsapp_status === 'delivered' ||
      posSuccessOrder.feedback_whatsapp_status === 'read'
    ) {
      setPosFeedbackMessage('Customer feedback WhatsApp has already been sent to this customer.');
      setPosFeedbackStatus('sent');
      return;
    }

    setPosFeedbackSending(true);
    setPosFeedbackMessage(null);
    setPosFeedbackStatus(null);
    try {
      const result = await api.sendOrderWhatsAppFeedback(posSuccessOrder.id);
      if (result.success) {
        if (result.status === 'sent') {
          setPosFeedbackMessage('Feedback request sent');
          setPosFeedbackStatus('sent');
          setPosSuccessOrder(prev => prev ? { ...prev, feedback_whatsapp_status: 'sent' } : prev);
        } else {
          setPosFeedbackMessage(result.message || 'Feedback request queued and will retry automatically');
          setPosFeedbackStatus('queued');
          setPosSuccessOrder(prev => prev ? { ...prev, feedback_whatsapp_status: 'retrying' } : prev);
        }
      } else {
        setPosFeedbackMessage(result.error || 'Feedback request failed — Retry');
        setPosFeedbackStatus('failed');
        setPosSuccessOrder(prev => prev ? { ...prev, feedback_whatsapp_status: 'failed' } : prev);
      }
      loadAllData();
    } catch (err: any) {
      setPosFeedbackMessage(err.message || 'Feedback request failed — Retry');
      setPosFeedbackStatus('failed');
    } finally {
      setPosFeedbackSending(false);
    }
  };

  const handleRetryPosReceipt = async (orderId: string) => {
    setPosRetryingReceipt(true);
    try {
      const res = await api.retryOrderWhatsApp(orderId, 'bill_receipt');
      if (res.success) {
        setPosSuccessOrder(prev => prev && prev.id === orderId ? { ...prev, receipt_whatsapp_status: 'sent', receipt_whatsapp_error: undefined } : prev);
      } else {
        setPosSuccessOrder(prev => prev && prev.id === orderId ? { ...prev, receipt_whatsapp_status: 'failed', receipt_whatsapp_error: res.error } : prev);
      }
      loadAllData();
    } catch (err: any) {
      console.warn('Error retrying receipt WhatsApp:', err);
    } finally {
      setPosRetryingReceipt(false);
    }
  };

  const handleRetryPosFeedback = async (orderId: string) => {
    setPosRetryingFeedback(true);
    try {
      const res = await api.retryOrderWhatsApp(orderId, 'customer_feedback');
      if (res.success) {
        setPosSuccessOrder(prev => prev && prev.id === orderId ? { ...prev, feedback_whatsapp_status: 'sent', feedback_whatsapp_error: undefined } : prev);
      } else {
        setPosSuccessOrder(prev => prev && prev.id === orderId ? { ...prev, feedback_whatsapp_status: 'failed', feedback_whatsapp_error: res.error } : prev);
      }
      loadAllData();
    } catch (err: any) {
      console.warn('Error retrying feedback WhatsApp:', err);
    } finally {
      setPosRetryingFeedback(false);
    }
  };

  const handleRetryOrderWhatsApp = async (orderId: string) => {
    try {
      const res = await api.retryOrderWhatsApp(orderId);
      loadAllData();
    } catch (err: any) {
      console.warn('Error retrying WhatsApp message:', err);
    }
  };

  // Stock Movement Submit
  const handleRecordStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockMovementModal.product) return;
    try {
      await api.recordInventoryMovement({
        product_id: stockMovementModal.product.id,
        product_name: stockMovementModal.product.name,
        movement_type: stockType,
        quantity: stockQty,
        notes: stockNotes,
        performed_by: currentUser?.name || 'Inventory Staff'
      }, currentUser?.name);
      setStockMovementModal({ isOpen: false });
      setStockNotes('');
      setStockQty(1);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Export for Sales & Financial Reports
  const handleExportCSV = () => {
    if (!detailedReports) return;
    const rows = [
      ['The Glossy Looks - Sales & Revenue Audit Report'],
      ['Report Period', detailedReports.filter.period.toUpperCase()],
      ['Date Range', `${detailedReports.filter.startDate} to ${detailedReports.filter.endDate}`],
      ['Generated At', new Date().toLocaleString()],
      ['Generated By', `${currentUser?.name} (${currentUser?.role})`],
      [],
      ['FINANCIAL SUMMARY'],
      ['Gross Sales (INR)', detailedReports.summary.gross_sales],
      ['Service Sales (INR)', detailedReports.summary.service_sales],
      ['Retail Product Sales (INR)', detailedReports.summary.product_sales],
      ['Total Collected / Paid (INR)', detailedReports.summary.total_paid],
      ['Total Discounts Given (INR)', detailedReports.summary.total_discount],
      ['GST / Tax Collected (INR)', detailedReports.summary.tax_gst],
      ['Outstanding Dues (INR)', detailedReports.summary.outstanding_due],
      ['Completed Orders', detailedReports.summary.completed_orders],
      ['Cancelled Orders', detailedReports.summary.cancelled_orders],
      ['Refunds Count', detailedReports.summary.refunded_count],
      ['Total Refunded (INR)', detailedReports.summary.total_refund_amount],
      [],
      ['PAYMENT MODES BREAKDOWN'],
      ['Mode', 'Collected (INR)'],
      ['Cash', detailedReports.payment_breakdown.cash],
      ['UPI', detailedReports.payment_breakdown.upi],
      ['Card', detailedReports.payment_breakdown.card],
      ['Split Payment', detailedReports.payment_breakdown.split],
      ['Other', detailedReports.payment_breakdown.other],
      [],
      ['DAY-WISE SALES BREAKDOWN'],
      ['Date', 'Orders', 'Service Sales (INR)', 'Product Sales (INR)', 'Discounts (INR)', 'GST (INR)', 'Gross Sales (INR)', 'Paid (INR)', 'Due (INR)', 'Cash', 'UPI', 'Card', 'Split'],
      ...detailedReports.day_wise_breakdown.map(d => [
        d.formatted_date,
        d.orders_count,
        d.service_sales,
        d.product_sales,
        d.discount_amount,
        d.tax_amount,
        d.total_sales,
        d.paid_amount,
        d.due_amount,
        d.cash_amount,
        d.upi_amount,
        d.card_amount,
        d.split_amount
      ]),
      [],
      ['STAFF PERFORMANCE BREAKDOWN'],
      ['Staff Name', 'Role', 'Services Done', 'Service Revenue (INR)', 'Commission Earned (INR)'],
      ...detailedReports.staff_performance.map(s => [
        s.staff_name,
        s.role,
        s.services_count,
        s.service_revenue,
        s.commission_earned
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tgl_sales_report_${detailedReports.filter.period}_${detailedReports.filter.startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Owner RBAC User Management Handlers
  const handleSaveAdminUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'owner') return;
    const form = e.currentTarget;
    const formData = new FormData(form);

    const user_id = (formData.get('user_id') as string)?.trim();
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const role = formData.get('role') as AdminRole;
    const password = (formData.get('password') as string)?.trim();
    const is_active = formData.get('is_active') === 'true';

    try {
      if (userModal.data?.id) {
        // Edit existing staff user
        await api.updateAdminUser(
          userModal.data.id,
          { user_id, name, email, phone, role, is_active },
          currentUser.name
        );
      } else {
        // Create new staff user
        if (!password || password.length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }
        await api.createAdminUser(
          { user_id, name, email, phone, role, password, is_active: true } as any,
          currentUser.name
        );
      }
      setUserModal({ isOpen: false });
      await loadAllData();
      if (currentUser && userModal.data?.id === currentUser.id) {
        const usersData = await api.getAdminUsers();
        const updatedMe = usersData.find(u => u.id === currentUser.id);
        if (updatedMe) {
          setCurrentUser(updatedMe);
          sessionStorage.setItem('the_glossy_looks_admin_session', JSON.stringify({ user: updatedMe }));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save staff user.');
    }
  };

  const handleResetAdminPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'owner' || !resetPasswordModal.user) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newPassword = (formData.get('new_password') as string)?.trim();
    const confirmPassword = (formData.get('confirm_password') as string)?.trim();

    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      await api.resetAdminUserPassword(resetPasswordModal.user.id, newPassword, currentUser.name);
      setResetPasswordModal({ isOpen: false });
      const logsData = await api.getAuditLogs();
      setAuditLogs(logsData);
      alert(`Password for ${resetPasswordModal.user.name} has been securely updated.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  const handleConfirmUserStatusToggle = async () => {
    if (!currentUser || currentUser.role !== 'owner' || !deactivateConfirmModal.user) return;
    try {
      const user = deactivateConfirmModal.user;
      if (deactivateConfirmModal.action === 'delete') {
        await api.deleteAdminUser(user.id, currentUser.name);
      } else {
        await api.updateAdminUser(
          user.id,
          { is_active: !user.is_active },
          currentUser.name
        );
      }
      setDeactivateConfirmModal({ isOpen: false });
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  // =========================================================================
  // PROTECTED LOGIN VIEW (If not logged in)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#120B0F] flex items-center justify-center p-4">
        <div className="bg-[#1A0F16] border border-[#D4AF37]/30 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
          <button
            onClick={onBackToWebsite}
            className="absolute left-6 top-6 text-white/50 hover:text-white flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Storefront</span>
          </button>

          <div className="text-center mt-6 mb-6">
            <img
              src="/assets/brand/glossy-looks-logo.png"
              alt="The Glossy Looks logo"
              className="w-14 h-14 rounded-full object-cover mx-auto shadow-xl mb-3"
            />
            <h2 className="font-serif font-bold text-2xl text-white">The Glossy Looks</h2>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">
              Staff & Operations Portal Login
            </span>
            <p className="text-[11px] text-white/60 mt-1">
              Access restricted to authorized salon staff and owners only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-white/80 font-semibold mb-1">
                User ID / Email / Mobile Number
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
                placeholder="e.g. TGL-OWN01, owner@theglossylooks.com, or registered mobile"
                className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white outline-none focus:border-[#D4AF37] placeholder:text-white/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/80 font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#D4AF37] hover:underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Enter password assigned by Salon Owner"
                className="w-full p-2.5 bg-white/5 border border-white/20 rounded-xl text-white outline-none focus:border-[#D4AF37] placeholder:text-white/30"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-900/40 border border-rose-500/50 rounded-xl text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#F3D7D7] text-[#120B0F] font-bold rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Staff Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick preset credentials for testing */}
          <div className="mt-6 pt-4 border-t border-white/10 text-xs">
            <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-2 font-semibold">
              Quick Fill Role Credentials:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PRESET_ACCOUNTS.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setLoginIdentifier(acc.identifier);
                    setLoginPassword(acc.password);
                    setLoginError('');
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-left text-[11px] border border-white/10 transition-colors"
                >
                  <strong className="text-[#D4AF37] block text-[10px] uppercase font-bold">{acc.role.replace('_', ' ')}</strong>
                  <span className="text-white/80 block font-mono text-[10px]">{acc.identifier}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-2 text-center">
              Customer OTP login cannot access the staff portal. Passwords are encrypted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ADMIN DASHBOARD & APPLICATION WORKSPACE
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col md:flex-row">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#120B0F] text-white flex flex-col shrink-0 border-r border-[#380E24]">
        {/* Brand Lockup */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/brand/glossy-looks-logo.png"
              alt="The Glossy Looks logo"
              className="w-9 h-9 rounded-full object-cover shadow-md"
            />
            <div>
              <h2 className="font-serif font-bold text-sm tracking-tight text-white leading-tight">
                The Glossy Looks
              </h2>
              <span className="text-[10px] text-[#D4AF37] font-semibold tracking-wider uppercase block">
                Salon OS · Hyderabad
              </span>
            </div>
          </div>
          <button
            onClick={onBackToWebsite}
            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
            title="Return to Customer Storefront"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Authenticated Staff User Profile Badge */}
        <div className="p-3 bg-white/5 border-b border-white/10 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">
              Authenticated Staff
            </span>
            <button
              onClick={handleLogout}
              className="text-[10px] text-rose-300 hover:text-rose-100 flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/30 transition-colors"
              title="Sign out of Admin Session"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 bg-[#1F0714] p-2 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-full bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-xs uppercase font-serif shrink-0 border border-[#D4AF37]/30">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-xs truncate">
                {currentUser.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-[#D4AF37] bg-white/5 px-1 py-0.2 rounded">
                  {currentUser.user_id || 'STAFF'}
                </span>
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                  currentUser.role === 'owner' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  currentUser.role === 'manager' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  currentUser.role === 'receptionist' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  currentUser.role === 'stylist' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                }`}>
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Module Navigation items governed by RBAC */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
            <span>Dashboard</span>
          </button>

          {/* 2. Customer CRM */}
          {(isOwner || isManager || isReceptionist) && (
            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'customers' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 text-[#D4AF37]" />
              <span>Customer CRM ({customers.length})</span>
            </button>
          )}

          {/* 3. Appointments & Bookings */}
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'appointments' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span>Appointments</span>
            </div>
            {appointments.filter(a => a.status === 'Pending').length > 0 && (
              <span className="text-[10px] bg-amber-500 text-slate-900 font-bold px-1.5 py-0.2 rounded-full">
                {appointments.filter(a => a.status === 'Pending').length}
              </span>
            )}
          </button>

          {/* 4. POS Billing */}
          {(isOwner || isManager || isReceptionist) && (
            <button
              onClick={() => setActiveTab('pos')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'pos' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <Receipt className="w-4 h-4 text-[#D4AF37]" />
              <span>POS Billing</span>
            </button>
          )}

          {/* 5. Payments & Reconciliation */}
          {(isOwner || isManager || isReceptionist) && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'payments' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#D4AF37]" />
              <span>Payments Ledger</span>
            </button>
          )}

          {/* 6. Service & Menu Management */}
          {(isOwner || isManager) && (
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'services' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>Services & Menu</span>
            </button>
          )}

          {/* 7. Stock Inventory */}
          {(isOwner || isManager || isInventoryStaff) && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'inventory' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-[#D4AF37]" />
                <span>Stock Inventory</span>
              </div>
              {products.filter(p => p.current_stock <= p.min_stock_alert).length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                  {products.filter(p => p.current_stock <= p.min_stock_alert).length}
                </span>
              )}
            </button>
          )}

          {/* 8. Staff Management */}
          {(isOwner || isManager || isStylist) && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'staff' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Staff & Rosters</span>
            </button>
          )}

          {/* 9. Gallery & Portfolio */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'gallery' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            <span>Gallery & Works</span>
          </button>

          {/* 10. Reports & Analytics */}
          {(isOwner || isManager) && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'reports' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              <span>Reports & Analytics</span>
            </button>
          )}

          {/* 11. Print Devices (MOZZ) */}
          <button
            onClick={() => setActiveTab('printers')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === 'printers' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>Print Devices (MOZZ)</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* 12. Settings & WhatsApp (Owner and Branch Manager) */}
          {(isOwner || isManager) && (
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setSettingsSubTab('whatsapp');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-colors ${
                  activeTab === 'settings' && settingsSubTab === 'whatsapp' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp Integration</span>
                </div>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {isOwner ? 'Owner' : 'Manager'}
                </span>
              </button>

              {isOwner && (
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setSettingsSubTab('users');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-colors ${
                    activeTab === 'settings' && settingsSubTab !== 'whatsapp' ? 'bg-[#5B132B] text-white font-bold' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  <Settings className="w-4 h-4 text-[#D4AF37]" />
                  <span>Admin Users & Security</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Back to Client Storefront button */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onBackToWebsite}
            className="w-full py-2 px-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Customer Website</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-serif font-bold text-xl text-slate-900 capitalize">
              {activeTab === 'pos'
                ? 'Reception POS Billing'
                : activeTab === 'settings'
                ? settingsSubTab === 'whatsapp'
                  ? 'Settings · WhatsApp Business Integration'
                  : 'Settings · Admin Users & Security'
                : activeTab.replace('_', ' ')}
            </h1>
            <p className="text-xs text-slate-500">
              The Glossy Looks · 31, Vinayak Nagar, Gachibowli, Hyderabad {settings?.phone ? `· Ph: ${settings.phone}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {((isOwner || isManager) && feedbackList.length > 0) && (
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(true)}
                className={`py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border shadow-xs ${
                  feedbackList.some(f => !f.is_read && (f.rating === 'average' || f.rating === 'bad'))
                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 ring-2 ring-rose-400/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Customer Experience Feedback & Automated Care"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#5B132B]" />
                <span>Feedback ({feedbackList.length})</span>
                {feedbackList.some(f => !f.is_read && (f.rating === 'average' || f.rating === 'bad')) && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </button>
            )}

            <button
              onClick={loadAllData}
              className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {isReceptionist && (
              <button
                onClick={() => setActiveTab('pos')}
                className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>New POS Bill</span>
              </button>
            )}
          </div>
        </header>

        {/* TAB CONTENTS */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* ================================================================= */}
          {/* 1. DASHBOARD */}
          {/* ================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Today&apos;s Appointments</span>
                  <div className="text-2xl font-serif font-bold text-slate-900 mt-1">
                    {appointments.length}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    {appointments.filter(a => a.status === 'Confirmed').length} Confirmed
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Sales Revenue</span>
                  <div className="text-2xl font-serif font-bold text-[#5B132B] mt-1">
                    ₹{reports?.totalSales || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {orders.length} Invoices generated
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pending Web Enquiries</span>
                  <div className="text-2xl font-serif font-bold text-amber-600 mt-1">
                    {appointments.filter(a => a.status === 'Pending').length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Requires receptionist confirmation
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Low-Stock Alert Items</span>
                  <div className="text-2xl font-serif font-bold text-rose-600 mt-1">
                    {products.filter(p => p.current_stock <= p.min_stock_alert).length}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium mt-1">
                    Below safety threshold
                  </div>
                </div>
              </div>

              {/* Quick Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bookings */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Recent Booking Enquiries
                    </h3>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="text-xs font-semibold text-[#5B132B] hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {appointments.slice(0, 4).map(apt => (
                      <div
                        key={apt.id}
                        className="p-3 rounded-xl bg-[#FAF7F5] border border-slate-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{apt.customer_name} ({apt.customer_phone})</div>
                          <div className="text-slate-500 text-[11px]">
                            {apt.appointment_date} at {apt.time_slot} · {apt.services.map(s => s.name).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {apt.status}
                          </span>
                          <button
                            onClick={async () => {
                              await api.updateAppointment(apt.id, { status: 'Confirmed' }, currentUser.name);
                              loadAllData();
                            }}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Confirm"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Devices Status */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Print Devices & Auto-Printing (MOZZ)
                    </h3>
                    <button
                      onClick={() => setActiveTab('printers')}
                      className="text-xs font-semibold text-[#5B132B] hover:underline"
                    >
                      Manage Queue
                    </button>
                  </div>

                  <div className="space-y-3">
                    {printDevices.map(dev => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl border border-slate-100 bg-[#FAF7F5] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Printer className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{dev.device_name}</div>
                            <div className="text-[11px] text-slate-500">{dev.printer_name} · {dev.branch}</div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Online
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. CUSTOMER CRM MODULE */}
          {/* ================================================================= */}
          {activeTab === 'customers' && (() => {
            const filteredCustomers = customers.filter(c => {
              if (!customerSearch.trim()) return true;
              const q = customerSearch.trim().toLowerCase();
              return (
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.mobile && c.mobile.includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.latest_bill_number && c.latest_bill_number.toLowerCase().includes(q))
              );
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search by customer name, mobile, email, or bill #..."
                        className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20 focus:border-[#5B132B] transition-all"
                      />
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => loadAllData()}
                      className="px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Refresh CRM customers from Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#5B132B]' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Total: <strong className="text-slate-900">{filteredCustomers.length}</strong> customers
                    </span>
                    <button
                      onClick={() => setCustomerModal({ isOpen: true, data: null })}
                      className="py-2.5 px-4 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Walk-in Customer</span>
                    </button>
                  </div>
                </div>

                {/* Customers Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Users className="w-7 h-7" />
                      </div>
                      <h4 className="font-serif font-bold text-base text-slate-800">
                        {customerSearch ? 'No matching customers found' : 'No customers in Supabase CRM'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {customerSearch
                          ? `No customer matches "${customerSearch}". Try searching by a different name, phone number or bill number.`
                          : 'Whenever a customer books an online appointment or a POS bill is generated, they will automatically be recorded here with complete visit history and spend.'}
                      </p>
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearch('')}
                          className="px-3.5 py-1.5 text-xs font-semibold text-[#5B132B] hover:underline cursor-pointer"
                        >
                          Clear search filter
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3.5">Customer Name</th>
                            <th className="p-3.5">Mobile & Email</th>
                            <th className="p-3.5">Branch</th>
                            <th className="p-3.5">First Visit</th>
                            <th className="p-3.5">Latest Visit</th>
                            <th className="p-3.5 text-center">Visits</th>
                            <th className="p-3.5">Total Billed</th>
                            <th className="p-3.5">Latest Bill #</th>
                            <th className="p-3.5">Feedback / Rating</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCustomers.map(c => {
                            const branchName = branches.find(b => b.id === c.branch_id)?.name || c.branch_name || (c.branch_id === 'brn-1793346038689' ? 'Kondapur' : 'Gachibowli Main');
                            const firstVisitDisplay = c.first_visit_at ? formatKolkataDateTime(c.first_visit_at) : (c.created_at ? formatKolkataDateTime(c.created_at) : '—');
                            const lastVisitDisplay = c.last_visit_at ? formatKolkataDateTime(c.last_visit_at) : (c.updated_at ? formatKolkataDateTime(c.updated_at) : '—');
                            const rating = (c.feedback_rating || '').toLowerCase();

                            return (
                              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-900">{c.name}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                      c.status === 'vip' ? 'bg-amber-100 text-amber-800' :
                                      c.status === 'inactive' ? 'bg-slate-100 text-slate-500' :
                                      c.status === 'blocked' ? 'bg-rose-100 text-rose-700' :
                                      'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {c.status || 'active'}
                                    </span>
                                    {c.allergies && (
                                      <span className="text-rose-600 font-semibold text-[10px]" title={c.allergies}>⚠️ Sensitive</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-mono text-slate-800 font-medium">+91 {c.mobile}</div>
                                  {c.email ? (
                                    <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{c.email}</div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">No email</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    <MapPin className="w-3 h-3 text-[#8C235A]" />
                                    <span>{branchName}</span>
                                  </span>
                                </td>
                                <td className="p-3.5 text-slate-600 text-[11px]">
                                  {firstVisitDisplay}
                                </td>
                                <td className="p-3.5 text-slate-600 text-[11px]">
                                  {lastVisitDisplay}
                                </td>
                                <td className="p-3.5 text-center font-bold text-slate-900">
                                  {c.visit_count || 1}
                                </td>
                                <td className="p-3.5 font-bold text-[#5B132B]">
                                  ₹{Number(c.total_spend || 0).toFixed(2)}
                                </td>
                                <td className="p-3.5">
                                  {c.latest_bill_number ? (
                                    <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                      {c.latest_bill_number}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">—</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {rating ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                      rating === 'good' ? 'bg-emerald-100 text-emerald-800' :
                                      rating === 'average' ? 'bg-amber-100 text-amber-800' :
                                      'bg-rose-100 text-rose-800'
                                    }`}>
                                      {rating === 'good' && '★ '}
                                      {rating.toUpperCase()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px] italic">No rating yet</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                  <a
                                    href={`https://wa.me/91${c.mobile}?text=${encodeURIComponent(`Hi ${c.name}, greetings from The Glossy Looks!`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Chat with customer on WhatsApp"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setCustomerModal({ isOpen: true, data: c })}
                                    className="inline-flex p-1.5 text-slate-600 hover:text-[#5B132B] hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Edit Customer Profile"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPosCustomerName(c.name);
                                      setPosCustomerPhone(c.mobile);
                                      setActiveTab('pos');
                                    }}
                                    className="inline-flex p-1.5 text-[#5B132B] hover:bg-[#FAF4F0] rounded-lg transition-colors font-bold"
                                    title="Create New POS Bill for Customer"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                  {isManager && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete customer ${c.name}?`)) {
                                          await api.deleteCustomer(c.id, currentUser.name);
                                          loadAllData();
                                        }
                                      }}
                                      className="inline-flex p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete Customer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 3. APPOINTMENTS MODULE */}
          {/* ================================================================= */}
          {activeTab === 'appointments' && (() => {
            const filteredAppointments = appointments.filter(apt => {
              if (appointmentBranchFilter === 'all') return true;
              return (apt.branch_id || 'tgl-gachibowli-main') === appointmentBranchFilter;
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-semibold text-slate-600">
                    Showing {filteredAppointments.length} scheduled bookings {appointmentBranchFilter !== 'all' ? `(filtered by ${branches.find(b => b.id === appointmentBranchFilter)?.name || 'branch'})` : `(all branches)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Branch:</span>
                    <select
                      value={appointmentBranchFilter}
                      onChange={e => setAppointmentBranchFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-[#5B132B]/20 font-medium cursor-pointer shadow-xs"
                    >
                      <option value="all">All Branches ({appointments.length})</option>
                      {branches.map(b => {
                        const count = appointments.filter(a => (a.branch_id || 'tgl-gachibowli-main') === b.id).length;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.name} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Booking Ref</th>
                          <th className="p-3.5">Branch</th>
                          <th className="p-3.5">Client & Phone</th>
                          <th className="p-3.5">Date & Slot</th>
                          <th className="p-3.5">Services</th>
                          <th className="p-3.5">Assigned Stylist</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAppointments.map(apt => (
                          <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-[#5B132B]">{apt.booking_reference}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <MapPin className="w-3 h-3 text-[#8C235A]" />
                                <span>{branches.find(b => b.id === apt.branch_id)?.name || (apt.branch_id === 'brn-1793346038689' ? 'Kondapur Branch' : 'Gachibowli Main Flagship')}</span>
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{apt.customer_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{apt.customer_phone}</div>
                              {apt.whatsapp_status && (
                                <button
                                  type="button"
                                  onClick={() => handleViewAppointmentLogs(apt)}
                                  className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    apt.whatsapp_status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' :
                                    apt.whatsapp_status === 'delivered' ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100' :
                                    apt.whatsapp_status === 'read' ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' :
                                    apt.whatsapp_status === 'pending_approval' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' :
                                    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title="Click to view WhatsApp delivery log history"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    apt.whatsapp_status === 'read' ? 'bg-blue-600' :
                                    apt.whatsapp_status === 'delivered' ? 'bg-teal-600' :
                                    apt.whatsapp_status === 'sent' ? 'bg-emerald-600' :
                                    apt.whatsapp_status === 'pending_approval' ? 'bg-amber-500' :
                                    'bg-rose-600'
                                  }`} />
                                  <span>
                                    {apt.whatsapp_status === 'sent' ? 'WA Sent' :
                                     apt.whatsapp_status === 'delivered' ? 'WA Delivered' :
                                     apt.whatsapp_status === 'read' ? 'WA Read' :
                                     apt.whatsapp_status === 'pending_approval' ? 'Pending Approval' :
                                     'WA Failed'}
                                  </span>
                                </button>
                              )}
                            </td>
                          <td className="p-3.5">
                            <div>{apt.appointment_date}</div>
                            <div className="text-[11px] text-slate-500">{apt.time_slot}</div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <div className="truncate font-medium">{apt.services.map(s => s.name).join(', ')}</div>
                            <div className="text-[10px] text-slate-400">Total: {apt.services.reduce((a, b) => a + b.duration, 0)}m</div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={apt.assigned_staff_id || ''}
                              onChange={async (e) => {
                                const stf = staffList.find(s => s.id === e.target.value);
                                await api.updateAppointment(apt.id, {
                                  assigned_staff_id: stf?.id,
                                  assigned_staff_name: stf?.name
                                }, currentUser.name);
                                loadAllData();
                              }}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1"
                            >
                              <option value="">-- Assign Stylist --</option>
                              {staffList
                                .filter(s => s.is_active || s.id === apt.assigned_staff_id)
                                .map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.title || s.role})
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">₹{apt.final_amount}</td>
                          <td className="p-3.5">
                            <select
                              value={apt.status}
                              onChange={async (e) => {
                                await api.updateAppointment(apt.id, { status: e.target.value as any }, currentUser.name);
                                loadAllData();
                              }}
                              className="text-xs font-bold bg-white border border-slate-200 rounded-lg p-1"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Checked In">Checked In</option>
                              <option value="Service In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                              <option value="No Show">No Show</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => onViewReceipt(undefined, apt, 'service_ticket')}
                              className="p-1.5 text-slate-600 hover:text-[#5B132B] hover:bg-slate-100 rounded-lg"
                              title="Print Service Ticket Slip"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {(isOwner || isManager) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppConfirm(apt)}
                                className="inline-flex p-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors"
                                title="Send official Meta WhatsApp appointment confirmation template"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <a
                                href={`https://wa.me/91${apt.customer_phone}?text=${encodeURIComponent(`Hi ${apt.customer_name}, your appointment at The Glossy Looks salon is scheduled for ${apt.appointment_date} at ${apt.time_slot}. Ref: ${apt.booking_reference}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                title="Open WhatsApp web chat"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setPosCustomerName(apt.customer_name);
                                setPosCustomerPhone(apt.customer_phone);
                                const items = apt.services.map(s => {
                                  const fullSrv = services.find(x => x.id === s.id) || services[0];
                                  return { service: fullSrv, quantity: 1, staffId: apt.assigned_staff_id };
                                });
                                setPosSelectedItems(items);
                                setActiveTab('pos');
                              }}
                              className="p-1.5 text-[#5B132B] hover:bg-[#FAF4F0] rounded-lg font-bold"
                              title="Convert to POS Bill"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

          {/* ================================================================= */}
          {/* 4. POS BILLING SCREEN */}
          {/* ================================================================= */}
          {/* ================================================================= */}
          {/* 4. POS BILLING SCREEN */}
          {/* ================================================================= */}
          {activeTab === 'pos' && (() => {
            const posCategoryPriority = ['makeup', 'mani-pedi', 'salon', 'spa', 'body-polishing'];
            const posDisplayCategoryName = (cat: ServiceCategory) =>
              cat.slug === 'mani-pedi' ? 'Nails Art' : cat.name;

            const posVisibleCategories = categories
              .filter(cat => cat.slug !== 'facials' && cat.name.toLowerCase() !== 'facials' && cat.id !== 'cat-facials')
              .sort((a, b) => {
                const aIndex = posCategoryPriority.indexOf(a.slug);
                const bIndex = posCategoryPriority.indexOf(b.slug);
                return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
              });

            const salonCategory = categories.find(c => c.slug === 'salon' || c.id === 'cat-salon');
            const isSalonActive = posCategoryFilter === 'salon' || (salonCategory && posCategoryFilter === salonCategory.id);
            const salonServices = services.filter(s =>
              (salonCategory && s.category_id === salonCategory.id) ||
              s.category_id === 'cat-salon' ||
              s.category_id === 'salon'
            );

            interface PosSalonGroupItem {
              id: string;
              name: string;
              children?: { id: string; name: string }[];
            }

            const POS_SALON_GROUPS: PosSalonGroupItem[] = [
              { id: 'threading', name: 'Threading' },
              {
                id: 'waxing',
                name: 'Waxing',
                children: [
                  { id: 'face-wax', name: 'Face Wax' },
                  { id: 'normal-wax', name: 'Normal Wax' },
                  { id: 'rica-wax', name: 'Rica Wax' },
                  { id: 'roll-on-wax', name: 'Roll On Wax' },
                  { id: 'peel-off-wax', name: 'Peel Off Wax' }
                ]
              },
              { id: 'd-tan-clean-up', name: 'D-Tan & Clean Up' },
              { id: 'facial-treatments', name: 'Facial Treatments' },
              { id: 'top-up-masks', name: 'Top Up Masks' },
              { id: 'massage', name: 'Massage' },
              { id: 'pedicure-manicure', name: 'Pedi & Mani' },
              {
                id: 'hair-care',
                name: 'Hair Care',
                children: [
                  { id: 'hair-wash-massage', name: 'Hair Wash & Massage' },
                  { id: 'hair-cuts', name: 'Hair Cuts' },
                  { id: 'hair-colour', name: 'Hair Colour' },
                  { id: 'blow-dry-styling', name: 'Blow Dry & Styling' },
                  { id: 'hair-spa', name: 'Hair Spa' },
                  { id: 'hair-makeover', name: 'Hair Makeover' }
                ]
              }
            ];

            const resolvePosSalonSubcategory = (srv: ServiceItem): string => {
              const sub = srv.salon_subcategory || '';
              if (sub === 'body-care') return 'massage';
              return sub;
            };

            const resolvePosSalonGroup = (srv: ServiceItem): string => {
              if (srv.salon_group) {
                if (srv.salon_group === 'body-care') return 'massage';
                return srv.salon_group;
              }
              const sub = srv.salon_subcategory || '';
              if (['face-wax', 'normal-wax', 'rica-wax', 'roll-on-wax', 'peel-off-wax'].includes(sub)) {
                return 'waxing';
              }
              if (['hair-wash-massage', 'hair-cuts', 'hair-colour', 'blow-dry-styling', 'hair-spa', 'hair-makeover'].includes(sub)) {
                return 'hair-care';
              }
              if (sub === 'body-care' || sub === 'massage') {
                return 'massage';
              }
              return sub || 'threading';
            };

            const getPosGroupCount = (groupId: string) => {
              if (groupId === 'all') return salonServices.length;
              return salonServices.filter(s => resolvePosSalonGroup(s) === groupId).length;
            };

            const getPosChildCount = (childId: string) => {
              return salonServices.filter(s => resolvePosSalonSubcategory(s) === childId).length;
            };

            const handleSelectPosSalonGroup = (groupId: string) => {
              setPosSalonGroup(groupId);
              if (groupId === 'all') {
                setPosSalonSubcategory('');
                return;
              }
              const groupDef = POS_SALON_GROUPS.find(g => g.id === groupId);
              if (groupDef?.children && groupDef.children.length > 0) {
                const childExists = groupDef.children.some(c => c.id === posSalonSubcategory);
                if (!childExists) {
                  setPosSalonSubcategory(groupDef.children[0].id);
                }
              } else {
                setPosSalonSubcategory('');
              }
            };

            const activePosGroupDef = POS_SALON_GROUPS.find(g => g.id === posSalonGroup);

            const getViewingLabel = () => {
              if (posSalonGroup === 'all') {
                return `All Salon (${salonServices.length})`;
              }
              if (!activePosGroupDef) return 'All Salon';
              if (activePosGroupDef.children && activePosGroupDef.children.length > 0) {
                const activeChild = activePosGroupDef.children.find(c => c.id === posSalonSubcategory) || activePosGroupDef.children[0];
                return `${activePosGroupDef.name} · ${activeChild?.name || ''}`;
              }
              return activePosGroupDef.name;
            };

            const filteredPosServices = services.filter(srv => {
              if (posSearch.trim()) {
                const q = posSearch.trim().toLowerCase();
                const match = (
                  srv.name.toLowerCase().includes(q) ||
                  (srv.description && srv.description.toLowerCase().includes(q)) ||
                  (srv.benefits && srv.benefits.toLowerCase().includes(q)) ||
                  (srv.salon_subcategory && srv.salon_subcategory.toLowerCase().includes(q)) ||
                  (srv.salon_group && srv.salon_group.toLowerCase().includes(q))
                );
                if (!match) return false;
              }

              if (posCategoryFilter === 'all') return true;

              if (isSalonActive) {
                const isSalonSrv = (salonCategory && srv.category_id === salonCategory.id) || srv.category_id === 'cat-salon' || srv.category_id === 'salon';
                if (!isSalonSrv) return false;

                if (posSalonGroup === 'all') return true;

                const srvGroup = resolvePosSalonGroup(srv);
                if (srvGroup !== posSalonGroup) return false;

                if (activePosGroupDef?.children && activePosGroupDef.children.length > 0) {
                  if (posSalonSubcategory) {
                    return resolvePosSalonSubcategory(srv) === posSalonSubcategory;
                  }
                }
                return true;
              }

              return srv.category_id === posCategoryFilter;
            });

            const posTotalItemsCount = posSelectedItems.reduce((sum, i) => sum + i.quantity, 0);
            const posSubtotalAmount = posSelectedItems.reduce((sum, i) => sum + ((i.service.discount_price || i.service.price) * i.quantity), 0);
            const posTaxAmount = Math.round(posSubtotalAmount * 0.05);
            const posGrandTotal = Math.max(0, posSubtotalAmount - posDiscount + posTaxAmount + posTip);

            const handleAddPosItem = (srv: ServiceItem) => {
              const existing = posSelectedItems.find(i => i.service.id === srv.id);
              if (existing) {
                setPosSelectedItems(prev => prev.map(i => i.service.id === srv.id ? { ...i, quantity: i.quantity + 1 } : i));
              } else {
                const defaultStylist = staffList.find(s => s.is_active && (s.role === 'stylist' || !s.role.includes('owner'))) || staffList.find(s => s.is_active) || staffList[0];
                setPosSelectedItems(prev => [...prev, { service: srv, quantity: 1, staffId: defaultStylist?.id }]);
              }
            };

            return (
              <div className="space-y-4">
                {/* 2) SEARCH BAR IN PLACE OF "Salon Service Menu & Retail Products" */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        placeholder="Search services by name, category, or code..."
                        className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/30 focus:border-[#5B132B] transition-all"
                        aria-label="Search POS services"
                      />
                      {posSearch && (
                        <button
                          type="button"
                          onClick={() => setPosSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B132B]"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {}}
                      className="px-4 py-2.5 bg-[#5B132B] hover:bg-[#430D1F] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </div>

                  {/* 4) CART BUTTON - POPS OUT THE CART MODAL WHEN SELECTED */}
                  <button
                    type="button"
                    onClick={() => setIsPosCartOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#5B132B] to-[#781B3C] hover:from-[#430D1F] hover:to-[#5B132B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                    title="Open Receipt Cart & POS Checkout"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                    <span>Receipt Cart ({posTotalItemsCount})</span>
                    {posTotalItemsCount > 0 && (
                      <span className="bg-[#D4AF37] text-[#5B132B] px-2 py-0.5 rounded-full text-[11px] font-extrabold ml-1">
                        ₹{posSubtotalAmount}
                      </span>
                    )}
                  </button>
                </div>

                {/* 1) SERVICE CATEGORIES (MATCHING SS1) */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-[#8C235A]">
                        Service Menu
                      </span>
                      <h3 className="text-base font-serif font-bold text-slate-900 tracking-tight">
                        Select Your Pampering Journey
                      </h3>
                    </div>

                    {/* Category Chips (SS1 style) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
                      <button
                        type="button"
                        onClick={() => setPosCategoryFilter('all')}
                        className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
                          posCategoryFilter === 'all'
                            ? 'bg-[#5B132B] text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                        }`}
                      >
                        All Services
                      </button>
                      {posVisibleCategories.map((cat) => {
                        const isActive = posCategoryFilter === cat.id || (posCategoryFilter === 'salon' && (cat.slug === 'salon' || cat.id === 'cat-salon'));
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setPosCategoryFilter(cat.id);
                              if (cat.slug === 'salon' || cat.id === 'cat-salon') {
                                setPosSalonGroup('all');
                                setPosSalonSubcategory('');
                              }
                            }}
                            className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                              isActive
                                ? 'bg-[#5B132B] text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                            }`}
                          >
                            <span>{posDisplayCategoryName(cat)}</span>
                            {cat.slug === 'makeup' && (
                              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Salon Subcategories Card (Grouped together like customer page, SS1/image_f40d05ba) */}
                  {isSalonActive && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-[#FAF4F0] via-white to-[#FAF4F0] rounded-xl border border-[#EBD9D0] shadow-2xs space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">✦</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8C235A]">Salon Services</h4>
                            <span className="text-[10px] bg-[#5B132B]/10 text-[#5B132B] font-semibold px-2 py-0.5 rounded-full">
                              Viewing {getViewingLabel()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">Select a subcategory to browse targeted treatments.</p>
                        </div>
                      </div>

                      {/* Primary Groups Row: All Salon (192) BEFORE Threading, matching Requirement 2 */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                          type="button"
                          onClick={() => handleSelectPosSalonGroup('all')}
                          className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                            posSalonGroup === 'all'
                              ? 'bg-[#5B132B] text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                          }`}
                        >
                          <span>All Salon</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            posSalonGroup === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {salonServices.length}
                          </span>
                        </button>

                        {POS_SALON_GROUPS.map((grp) => {
                          const isGrpActive = posSalonGroup === grp.id;
                          const count = getPosGroupCount(grp.id);
                          return (
                            <button
                              key={grp.id}
                              type="button"
                              onClick={() => handleSelectPosSalonGroup(grp.id)}
                              className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                isGrpActive
                                  ? 'bg-[#5B132B] text-white shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                              }`}
                            >
                              <span>{grp.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                isGrpActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Secondary Subcategories Row: Shown when Waxing or Hair Care is selected */}
                      {activePosGroupDef?.children && activePosGroupDef.children.length > 0 && (
                        <div className="pt-2 border-t border-[#EBD9D0]/60">
                          <p className="text-xs font-semibold text-[#8C235A] flex items-center gap-1.5 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8C235A]"></span>
                            <span>{activePosGroupDef.name} Subcategories:</span>
                          </p>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {activePosGroupDef.children.map((child) => {
                              const isChildActive = posSalonSubcategory === child.id;
                              const childCount = getPosChildCount(child.id);
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => setPosSalonSubcategory(child.id)}
                                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    isChildActive
                                      ? 'bg-[#5B132B] text-white shadow-xs'
                                      : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                                  }`}
                                >
                                  <span>{child.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isChildActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {childCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3) SERVICES GRID WITH INSTANT ADD-TO-CART */}
                {filteredPosServices.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 font-medium">No services match the current filter or search &ldquo;{posSearch}&rdquo;.</p>
                    <button
                      type="button"
                      onClick={() => { setPosSearch(''); setPosCategoryFilter('all'); }}
                      className="mt-3 px-3.5 py-1.5 bg-[#5B132B] text-white text-xs font-semibold rounded-lg"
                    >
                      Show All Services
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredPosServices.map(srv => {
                      const existingInCart = posSelectedItems.find(i => i.service.id === srv.id);
                      const inCartQty = existingInCart?.quantity || 0;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => handleAddPosItem(srv)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group cursor-pointer relative ${
                            inCartQty > 0
                              ? 'bg-[#FFF9F6] border-[#5B132B] shadow-xs ring-1 ring-[#5B132B]/30'
                              : 'bg-white border-slate-200 hover:border-[#5B132B] hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold text-[#8C235A] uppercase truncate">
                                {categories.find(c => c.id === srv.category_id)?.name || 'Salon'}
                              </span>
                              {inCartQty > 0 && (
                                <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Qty: {inCartQty}</span>
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif font-bold text-xs text-slate-900 group-hover:text-[#5B132B] line-clamp-1 mt-0.5">
                              {srv.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">{srv.duration_minutes}m</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold text-xs text-slate-900">
                                ₹{srv.discount_price || srv.price}
                              </span>
                              {srv.discount_price && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  ₹{srv.price}
                                </span>
                              )}
                            </div>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                              inCartQty > 0 ? 'bg-[#5B132B] text-white' : 'bg-[#FAF4F0] text-[#5B132B] group-hover:bg-[#5B132B] group-hover:text-white'
                            }`}>
                              +
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* FLOATING CART BAR ON MOBILE / TABLET */}
                {posTotalItemsCount > 0 && !isPosCartOpen && (
                  <div className="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md border border-[#EBD9D0] rounded-2xl shadow-xl p-3 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-xs">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {posTotalItemsCount} {posTotalItemsCount === 1 ? 'item' : 'items'} in cart
                        </p>
                        <p className="text-[11px] font-semibold text-[#8C235A]">
                          Subtotal: ₹{posSubtotalAmount}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPosCartOpen(true)}
                      className="px-4 py-2 bg-[#5B132B] hover:bg-[#430D1F] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Open Cart & Checkout →
                    </button>
                  </div>
                )}

                {/* 4) POPOUT CART & POS CHECKOUT MODAL */}
                {isPosCartOpen && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
                      {/* Modal Header */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#FAF7F5]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-sm shadow-xs">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-serif font-bold text-base text-slate-900">
                              Receipt Cart & POS Checkout
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Cashier: <strong className="text-slate-800">{currentUser.name}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPosCartOpen(false)}
                          className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          aria-label="Close cart popout"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Modal Body / Form */}
                      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                        <form onSubmit={handlePosCheckout} className="space-y-4">
                          {/* 4) Branch Dropdown (Requirement 4: Populated from live branches) */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Salon Branch *
                            </label>
                            <select
                              ref={posBranchRef}
                              required
                              value={posBranchId}
                              onChange={(e) => setPosBranchId(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#D4AF37]/50 font-medium text-slate-900 shadow-xs cursor-pointer"
                            >
                              <option value="" disabled>Select salon branch...</option>
                              {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                  {branch.name} — {branch.city || branch.address || 'Flagship'}
                                </option>
                              ))}
                            </select>
                            {branches.length === 0 && (
                              <p className="mt-1 text-[10px] text-amber-700">Loading branch list...</p>
                            )}
                          </div>

                          {/* Customer Info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Name *</label>
                              <input
                                ref={posCustomerNameRef}
                                type="text"
                                required
                                value={posCustomerName}
                                onChange={e => setPosCustomerName(e.target.value)}
                                placeholder="e.g. Pooja Agarwal"
                                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#5B132B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Number *</label>
                              <input
                                ref={posCustomerPhoneRef}
                                type="tel"
                                required
                                value={posCustomerPhone}
                                onChange={e => setPosCustomerPhone(e.target.value)}
                                placeholder="10-digit number"
                                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-[#5B132B]"
                              />
                            </div>
                          </div>

                          {/* Selected Items List */}
                          <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-[11px] font-bold text-slate-800">
                                Selected Items ({posSelectedItems.length})
                              </label>
                              {posSelectedItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPosSelectedItems([])}
                                  className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                                >
                                  Clear All
                                </button>
                              )}
                            </div>

                            {posSelectedItems.length === 0 ? (
                              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-xs text-slate-400 italic">No services added to bill yet.</p>
                                <button
                                  type="button"
                                  onClick={() => setIsPosCartOpen(false)}
                                  className="mt-2 text-xs font-semibold text-[#8C235A] hover:underline cursor-pointer"
                                >
                                  Browse Menu & Add Services
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {posSelectedItems.map((item, idx) => (
                                  <div key={idx} className="p-2.5 bg-[#FAF7F5] rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                                        {item.service.name}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900">₹{(item.service.discount_price || item.service.price) * item.quantity}</span>
                                        <button
                                          type="button"
                                          onClick={() => setPosSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                                          className="w-5 h-5 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                                          title="Remove item"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-600">Qty:</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (item.quantity > 1) {
                                              setPosSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: x.quantity - 1 } : x));
                                            } else {
                                              setPosSelectedItems(prev => prev.filter((_, i) => i !== idx));
                                            }
                                          }}
                                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 font-bold cursor-pointer"
                                        >
                                          <Minus className="w-2.5 h-2.5" />
                                        </button>
                                        <span className="font-bold text-slate-800 px-1">{item.quantity}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPosSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: x.quantity + 1 } : x));
                                          }}
                                          className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 font-bold cursor-pointer"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                      <select
                                        value={item.staffId}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setPosSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, staffId: val } : x));
                                        }}
                                        className="text-[10px] bg-white border border-slate-200 rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
                                      >
                                        {staffList
                                          .filter(s => s.is_active || s.id === item.staffId)
                                          .map(s => (
                                            <option key={s.id} value={s.id}>
                                              Stylist: {s.name} ({s.title || s.role})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Pricing Breakdown */}
                          {posSelectedItems.length > 0 && (
                            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                              <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span>₹{posSubtotalAmount}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-600">
                                <span>Discount (₹):</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={posDiscount}
                                  onChange={e => setPosDiscount(Number(e.target.value))}
                                  className="w-20 p-1 text-right text-xs bg-slate-50 border border-slate-200 rounded"
                                />
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>GST (5%):</span>
                                <span>₹{posTaxAmount}</span>
                              </div>

                              {/* Payment Mode */}
                              <div className="pt-2">
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                  Payment Mode *
                                </label>
                                <select
                                  ref={posPaymentModeRef}
                                  required
                                  value={posPaymentMode}
                                  onChange={(e) => setPosPaymentMode(e.target.value as any)}
                                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                                >
                                  <option value="" disabled>Select payment mode</option>
                                  <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                                  <option value="Cash">Cash Counter</option>
                                  <option value="Card">Credit / Debit Card</option>
                                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                                  <option value="Split Payment">Split Payment</option>
                                  <option value="Pay Later">Pay Later</option>
                                </select>
                              </div>

                              <div className="flex justify-between font-bold text-sm text-[#5B132B] pt-2 border-t border-slate-200">
                                <span>Grand Total:</span>
                                <span>₹{posGrandTotal}</span>
                              </div>
                            </div>
                          )}

                          {/* Immediate Billing Status Toast / Banner */}
                          {posBillingStatus && (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2.5 animate-pulse shadow-xs">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                              <span className="font-semibold">{posBillingStatus}</span>
                            </div>
                          )}

                          {posBillingError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2.5 shadow-xs">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-bold">{posBillingError}</p>
                                <p className="text-[11px] text-rose-700 mt-0.5">Your entered bill data is safely preserved. You can adjust and retry anytime.</p>
                              </div>
                            </div>
                          )}

                          {/* 1. Fast & Clear Generate Bill Button */}
                          {isGeneratingBill ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B]/85 flex items-center justify-center gap-2 shadow-sm cursor-not-allowed"
                            >
                              <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                              <span>Generating Bill…</span>
                            </button>
                          ) : posSuccessOrder ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 flex items-center justify-center gap-2 cursor-default"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Bill Generated ({posSuccessOrder.bill_number})</span>
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={posSelectedItems.length === 0}
                              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#5B132B]/15 disabled:opacity-50 cursor-pointer"
                            >
                              <Receipt className="w-4 h-4 text-[#D4AF37]" />
                              <span>Generate Bill & Auto-Print Receipt</span>
                            </button>
                          )}

                          {/* 2. Manual Send Customer Feedback on WhatsApp */}
                          {(() => {
                            const isFeedbackSent = posSuccessOrder?.feedback_whatsapp_status === 'sent' || posSuccessOrder?.feedback_whatsapp_status === 'delivered' || posSuccessOrder?.feedback_whatsapp_status === 'read';
                            return (
                              <button
                                type="button"
                                onClick={handleSendPosFeedback}
                                disabled={!posSuccessOrder || posFeedbackSending || isFeedbackSent}
                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                                  isFeedbackSent
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                    : 'text-[#087443] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                }`}
                                title={
                                  isFeedbackSent
                                    ? 'Feedback template already delivered to customer'
                                    : posSuccessOrder
                                    ? 'Send approved feedback template immediately without waiting 2 minutes'
                                    : 'Generate the bill first'
                                }
                              >
                                {posFeedbackSending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                    <span>Sending feedback…</span>
                                  </>
                                ) : isFeedbackSent ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Feedback Sent on WhatsApp</span>
                                  </>
                                ) : (
                                  <>
                                    <MessageCircle className="w-4 h-4" />
                                    <span>Send Customer Feedback on WhatsApp</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}

                          {/* Clear Results Banner for Feedback */}
                          {posFeedbackMessage && (
                            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                              posFeedbackStatus === 'sent'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : posFeedbackStatus === 'queued'
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                              <div className="flex items-center gap-2">
                                {posFeedbackStatus === 'sent' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {posFeedbackStatus === 'queued' && <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                                {posFeedbackStatus === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                                <span className="font-semibold">{posFeedbackMessage}</span>
                              </div>
                              {posFeedbackStatus === 'failed' && posSuccessOrder && (
                                <button
                                  type="button"
                                  onClick={handleSendPosFeedback}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          )}
                        </form>

                        {/* Bill Generated Success Banner & Actions with Two-Track WhatsApp Live Status */}
                        {posSuccessOrder && (
                          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-950">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Bill {posSuccessOrder.bill_number} Created!</span>
                              </div>
                            </div>

                            {/* Two Separate Live Status Badges */}
                            <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 space-y-2.5">
                              {/* Track 1: Bill Receipt WhatsApp */}
                              {(() => {
                                const receiptStatus = posSuccessOrder.receipt_whatsapp_status || posSuccessOrder.whatsapp_status || 'sending';
                                return (
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                                      <Receipt className="w-3.5 h-3.5 text-[#5B132B]" />
                                      <span>Bill Receipt WhatsApp:</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                        receiptStatus === 'delivered' || receiptStatus === 'read'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : receiptStatus === 'sent'
                                          ? 'bg-blue-100 text-blue-800'
                                          : receiptStatus === 'sending'
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : receiptStatus === 'failed'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {receiptStatus === 'sending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                        {receiptStatus === 'delivered' || receiptStatus === 'read' ? 'Delivered' :
                                         receiptStatus === 'sent' ? 'Sent' :
                                         receiptStatus === 'sending' ? 'Sending…' :
                                         receiptStatus === 'failed' ? 'Failed' : 'Queued'}
                                      </span>
                                      {receiptStatus === 'failed' && (
                                        <button
                                          type="button"
                                          onClick={() => handleRetryPosReceipt(posSuccessOrder.id)}
                                          disabled={posRetryingReceipt}
                                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                          title="Retry sending bill receipt template"
                                        >
                                          {posRetryingReceipt ? 'Retrying…' : 'Retry'}
                                        </button>
                                      )}
                                    </div>
                                    {receiptStatus === 'failed' && posSuccessOrder.receipt_whatsapp_error && (
                                      <div className="w-full text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 mt-1 font-mono break-all">
                                        <span className="font-semibold text-rose-900">Error: </span>
                                        {posSuccessOrder.receipt_whatsapp_error}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Track 2: Feedback WhatsApp */}
                              {(() => {
                                const feedbackStatus = posSuccessOrder.feedback_whatsapp_status || 'scheduled';
                                return (
                                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                                    <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                      <span>Feedback WhatsApp:</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                        feedbackStatus === 'delivered' || feedbackStatus === 'read'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : feedbackStatus === 'sent'
                                          ? 'bg-blue-100 text-blue-800'
                                          : feedbackStatus === 'sending'
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : feedbackStatus === 'failed'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {feedbackStatus === 'sending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                        {feedbackStatus === 'delivered' || feedbackStatus === 'read' ? 'Delivered' :
                                         feedbackStatus === 'sent' ? 'Sent' :
                                         feedbackStatus === 'sending' ? 'Sending…' :
                                         feedbackStatus === 'failed' ? 'Failed' : 'Scheduled for 2 minutes'}
                                      </span>
                                      {feedbackStatus === 'failed' && (
                                        <button
                                          type="button"
                                          onClick={() => handleRetryPosFeedback(posSuccessOrder.id)}
                                          disabled={posRetryingFeedback}
                                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                          title="Retry sending customer feedback template"
                                        >
                                          {posRetryingFeedback ? 'Retrying…' : 'Retry'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <p className="text-[11px] text-emerald-700">Auto-queued to Salon Desktop Print Agent.</p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => onViewReceipt(posSuccessOrder, undefined, 'bill')}
                                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs cursor-pointer text-center transition-colors"
                              >
                                Preview / Reprint Thermal Receipt
                              </button>
                              <button
                                type="button"
                                onClick={handleResetPosForm}
                                className="py-2 px-3.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                                title="Clear form and start a new bill"
                              >
                                New Bill
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 5. PAYMENTS & RECONCILIATION MODULE */}
          {/* ================================================================= */}
          {/* ================================================================= */}
          {/* 5. PAYMENTS & RECONCILIATION MODULE */}
          {/* ================================================================= */}
          {activeTab === 'payments' && (() => {
            const filteredPayments = payments
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .filter(p => {
                // 1. Search by Bill Number, Customer Name or Mobile
                if (ledgerSearch.trim()) {
                  const q = ledgerSearch.trim().toLowerCase();
                  const match = (
                    (p.bill_number && p.bill_number.toLowerCase().includes(q)) ||
                    (p.customer_phone && p.customer_phone.includes(q)) ||
                    (p.customer_name && p.customer_name.toLowerCase().includes(q))
                  );
                  if (!match) return false;
                }

                // 2. Branch Filter
                if (ledgerBranchFilter !== 'all') {
                  const pBranch = p.branch_id || 'tgl-gachibowli-main';
                  if (pBranch !== ledgerBranchFilter) return false;
                }

                // 3. Payment Mode Filter
                if (ledgerModeFilter !== 'all') {
                  if (p.payment_mode !== ledgerModeFilter) return false;
                }

                // 4. Date Filtering in Asia/Kolkata Timezone
                if (ledgerDateFilter !== 'all') {
                  const recordDateKolkata = getKolkataDateString(p.created_at);
                  const todayKolkata = getKolkataDateString(new Date());

                  if (ledgerDateFilter === 'today') {
                    if (recordDateKolkata !== todayKolkata) return false;
                  } else if (ledgerDateFilter === 'yesterday') {
                    const yDate = new Date();
                    yDate.setDate(yDate.getDate() - 1);
                    const yesterdayKolkata = getKolkataDateString(yDate);
                    if (recordDateKolkata !== yesterdayKolkata) return false;
                  } else if (ledgerDateFilter === 'this_week') {
                    const [y, m, d] = todayKolkata.split('-').map(Number);
                    const tDate = new Date(y, m - 1, d);
                    const day = tDate.getDay();
                    const diff = (day + 6) % 7;
                    const monday = new Date(tDate);
                    monday.setDate(tDate.getDate() - diff);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    const monStr = getKolkataDateString(monday);
                    const sunStr = getKolkataDateString(sunday);
                    if (recordDateKolkata < monStr || recordDateKolkata > sunStr) return false;
                  } else if (ledgerDateFilter === 'this_month') {
                    const monthPrefix = todayKolkata.slice(0, 7);
                    if (!recordDateKolkata.startsWith(monthPrefix)) return false;
                  } else if (ledgerDateFilter === 'custom') {
                    if (ledgerStartDate && recordDateKolkata < ledgerStartDate) return false;
                    if (ledgerEndDate && recordDateKolkata > ledgerEndDate) return false;
                  }
                }

                return true;
              });

            // Calculate KPI Totals for Filtered Payments
            const ledgerTotalBills = filteredPayments.length;
            const ledgerTotalSales = filteredPayments.reduce((sum, p) => {
              const matchingOrder = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
              const sub = p.subtotal ?? matchingOrder?.subtotal ?? p.amount;
              return sum + Number(sub || 0);
            }, 0);
            const ledgerTotalDiscount = filteredPayments.reduce((sum, p) => {
              const matchingOrder = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
              const disc = p.discount ?? matchingOrder?.discount ?? 0;
              return sum + Number(disc || 0);
            }, 0);
            const ledgerTotalGST = filteredPayments.reduce((sum, p) => {
              const matchingOrder = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
              const tax = p.tax_amount ?? matchingOrder?.tax_amount ?? 0;
              return sum + Number(tax || 0);
            }, 0);
            const ledgerTotalCollected = filteredPayments.reduce((sum, p) => {
              if (p.status === 'Success') {
                return sum + Number(p.amount || 0);
              }
              return sum;
            }, 0);

            const handleOpenOrderDetails = (p: PaymentRecord) => {
              const ord = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
              setOrderDetailsModal({ isOpen: true, order: ord || null, payment: p });
            };

            const handleOpenOrderEdit = (p: PaymentRecord) => {
              const ord = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
              setOrderEditModal({ isOpen: true, order: ord || null, payment: p });
              setEditOrderDiscount(ord?.discount ?? p.discount ?? 0);
              setEditOrderPaymentMode((ord?.primary_payment_mode || p.payment_mode || 'Cash') as any);
              setEditOrderPaymentStatus((ord?.payment_status || (p.status === 'Success' ? 'Paid' : 'Pending')) as any);
              setEditOrderCustomerName(ord?.customer_name || p.customer_name || '');
              setEditOrderCustomerPhone(ord?.customer_phone || p.customer_phone || '');
              setEditOrderNotes(ord?.notes || p.notes || '');
              setOrderEditError(null);
            };

            return (
              <div className="space-y-4">
                {/* Header & Description */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Payment Ledger & Order Settlements
                    </h3>
                    <span className="text-xs text-slate-500">
                      Real-time settlements across UPI, Cash, Cards, and online appointment bookings (Asia/Kolkata)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadAllData()}
                    className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Refresh payment records from Supabase"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#5B132B]' : ''}`} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Bills</span>
                    <div className="text-lg font-extrabold text-slate-900">{ledgerTotalBills}</div>
                    <span className="text-[10px] text-slate-500">Filtered bills</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gross Sales</span>
                    <div className="text-lg font-extrabold text-[#5B132B]">₹{ledgerTotalSales.toFixed(2)}</div>
                    <span className="text-[10px] text-slate-500">Before discounts</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Discounts</span>
                    <div className="text-lg font-extrabold text-amber-700">₹{ledgerTotalDiscount.toFixed(2)}</div>
                    <span className="text-[10px] text-slate-500">Customer savings</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GST (5%)</span>
                    <div className="text-lg font-extrabold text-slate-800">₹{ledgerTotalGST.toFixed(2)}</div>
                    <span className="text-[10px] text-slate-500">Tax component</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Total Collected</span>
                    <div className="text-lg font-extrabold text-emerald-700">₹{ledgerTotalCollected.toFixed(2)}</div>
                    <span className="text-[10px] text-emerald-600 font-medium">Settled revenue</span>
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Presets */}
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'this_week', label: 'This Week' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'custom', label: 'Custom Range' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLedgerDateFilter(tab.id as any)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            ledgerDateFilter === tab.id
                              ? 'bg-[#5B132B] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Range Inputs */}
                    {ledgerDateFilter === 'custom' && (
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500 text-[11px]">From:</span>
                          <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={e => setLedgerStartDate(e.target.value)}
                            className="p-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500 text-[11px]">To:</span>
                          <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={e => setLedgerEndDate(e.target.value)}
                            className="p-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={ledgerSearch}
                        onChange={e => setLedgerSearch(e.target.value)}
                        placeholder="Search bill # or mobile..."
                        className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                      />
                      {ledgerSearch && (
                        <button
                          type="button"
                          onClick={() => setLedgerSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Branch Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">Branch:</span>
                      <select
                        value={ledgerBranchFilter}
                        onChange={e => setLedgerBranchFilter(e.target.value)}
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white cursor-pointer"
                      >
                        <option value="all">All Branches</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Mode Filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 shrink-0">Mode:</span>
                      <select
                        value={ledgerModeFilter}
                        onChange={e => setLedgerModeFilter(e.target.value)}
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white cursor-pointer"
                      >
                        <option value="all">All Payment Modes</option>
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash Counter</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Split Payment">Split Payment</option>
                        <option value="Pay Later">Pay Later</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {filteredPayments.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <CreditCard className="w-7 h-7" />
                      </div>
                      <h4 className="font-serif font-bold text-base text-slate-800">
                        No payment records found
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {ledgerSearch || ledgerDateFilter !== 'all' || ledgerBranchFilter !== 'all' || ledgerModeFilter !== 'all'
                          ? 'No payments match the active filter criteria. Try resetting the filters.'
                          : 'Every POS bill and completed appointment payment will automatically appear here with complete audit trail and WhatsApp delivery logs.'}
                      </p>
                      {(ledgerSearch || ledgerDateFilter !== 'all' || ledgerBranchFilter !== 'all' || ledgerModeFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setLedgerDateFilter('all');
                            setLedgerBranchFilter('all');
                            setLedgerModeFilter('all');
                            setLedgerSearch('');
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-[#5B132B] hover:underline cursor-pointer"
                        >
                          Reset all filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3.5">Bill Number</th>
                            <th className="p-3.5">Date & Time (IST)</th>
                            <th className="p-3.5">Customer & Phone</th>
                            <th className="p-3.5">Branch</th>
                            <th className="p-3.5">Mode</th>
                            <th className="p-3.5">Subtotal</th>
                            <th className="p-3.5">Discount</th>
                            <th className="p-3.5">GST (5%)</th>
                            <th className="p-3.5">Paid Total</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5">Receipt WhatsApp</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPayments.map(p => {
                            const matchingOrder = orders.find(o => o.id === p.order_id || o.bill_number === p.bill_number);
                            const receiptStatus = matchingOrder?.receipt_whatsapp_status || matchingOrder?.whatsapp_status || p.receipt_whatsapp_status || 'queued';
                            const branchName = branches.find(b => b.id === p.branch_id)?.name || p.branch_name || (p.branch_id === 'brn-1793346038689' ? 'Kondapur' : 'Gachibowli Main');
                            const subtotalVal = p.subtotal ?? matchingOrder?.subtotal ?? p.amount;
                            const discountVal = p.discount ?? matchingOrder?.discount ?? 0;
                            const taxVal = p.tax_amount ?? matchingOrder?.tax_amount ?? 0;

                            return (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3.5 font-mono font-bold text-[#5B132B]">
                                  {p.bill_number}
                                </td>
                                <td className="p-3.5 text-slate-600 text-[11px] whitespace-nowrap">
                                  {formatKolkataDateTime(p.created_at)}
                                </td>
                                <td className="p-3.5">
                                  <div className="font-semibold text-slate-900">{p.customer_name}</div>
                                  <div className="font-mono text-[11px] text-slate-500">+91 {p.customer_phone}</div>
                                </td>
                                <td className="p-3.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    <MapPin className="w-3 h-3 text-[#8C235A]" />
                                    <span>{branchName}</span>
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                                    {p.payment_mode}
                                  </span>
                                </td>
                                <td className="p-3.5 text-slate-700 font-medium">
                                  ₹{Number(subtotalVal || 0).toFixed(2)}
                                </td>
                                <td className="p-3.5 text-amber-700 font-medium">
                                  {discountVal > 0 ? `₹${Number(discountVal).toFixed(2)}` : '—'}
                                </td>
                                <td className="p-3.5 text-slate-700 font-medium">
                                  ₹{Number(taxVal || 0).toFixed(2)}
                                </td>
                                <td className="p-3.5 font-bold text-slate-900">
                                  ₹{Number(p.amount || 0).toFixed(2)}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.status === 'Success' ? 'bg-emerald-100 text-emerald-800' :
                                    p.status === 'Refunded' ? 'bg-amber-100 text-amber-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      receiptStatus === 'delivered' || receiptStatus === 'read' ? 'bg-emerald-100 text-emerald-800' :
                                      receiptStatus === 'sent' ? 'bg-blue-100 text-blue-800' :
                                      receiptStatus === 'failed' ? 'bg-rose-100 text-rose-800' :
                                      'bg-amber-100 text-amber-800'
                                    }`}>
                                      {receiptStatus === 'delivered' || receiptStatus === 'read' ? 'Delivered' :
                                       receiptStatus === 'sent' ? 'Sent' :
                                       receiptStatus === 'failed' ? 'Failed' : 'Queued'}
                                    </span>
                                    {receiptStatus === 'failed' && (matchingOrder || p.order_id) && (
                                      <button
                                        type="button"
                                        onClick={() => handleRetryPosReceipt(matchingOrder?.id || p.order_id)}
                                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                                        title="Retry sending receipt"
                                      >
                                        Retry
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOrderDetails(p)}
                                    className="py-1 px-2.5 text-[11px] font-semibold text-[#5B132B] hover:bg-[#FAF4F0] rounded-lg transition-colors cursor-pointer"
                                    title="View detailed order line items and pricing"
                                  >
                                    Order Details
                                  </button>

                                  {(isOwner || isManager) && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenOrderEdit(p)}
                                      className="py-1 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Order / Payment Details"
                                    >
                                      Edit
                                    </button>
                                  )}

                                  {p.status === 'Success' && isManager && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const reason = prompt('Please enter reason for refund:');
                                        if (reason) {
                                          await api.refundPayment(p.id, reason, currentUser.name);
                                          loadAllData();
                                        }
                                      }}
                                      className="py-1 px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    >
                                      Refund
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* 6. SERVICES & MENU MANAGEMENT MODULE */}
          {/* ================================================================= */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Service Catalog & Menu Management
                  </h3>
                  <span className="text-xs text-slate-500">Edit prices, durations, descriptions, and bridal categories</span>
                </div>
                <button
                  onClick={() => setServiceModal({ isOpen: true, data: null })}
                  className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Service</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Service Name</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Duration</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Offer Price</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {services.map(srv => (
                        <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{srv.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{srv.description}</div>
                          </td>
                          <td className="p-3.5 font-semibold text-[#8C235A]">
                            {categories.find(c => c.id === srv.category_id)?.name || 'Salon'}
                          </td>
                          <td className="p-3.5 text-slate-600">{srv.duration_minutes} mins</td>
                          <td className="p-3.5 font-bold text-slate-900">₹{srv.price}</td>
                          <td className="p-3.5 font-bold text-[#5B132B]">{srv.discount_price ? `₹${srv.discount_price}` : '—'}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Active
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => setServiceModal({ isOpen: true, data: srv })}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete service ${srv.name}?`)) {
                                  await api.deleteService(srv.id, currentUser.name);
                                  loadAllData();
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 7. STOCK INVENTORY MODULE */}
          {/* ================================================================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Stock & Consumables Inventory
                  </h3>
                  <span className="text-xs text-slate-500">Track facial kits, hair colours, creams, and waxing supplies</span>
                </div>
                <button
                  onClick={() => setProductModal({ isOpen: true, data: null })}
                  className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product Item</span>
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(prod => {
                  const isLow = prod.current_stock <= prod.min_stock_alert;
                  return (
                    <div
                      key={prod.id}
                      className={`p-4 rounded-2xl border bg-white shadow-xs flex flex-col justify-between ${
                        isLow ? 'border-rose-300 ring-1 ring-rose-300/40' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-[#8C235A]">
                            {prod.category} · {prod.brand}
                          </span>
                          {isLow ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                              Low Stock Alert
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                              In Stock
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif font-bold text-sm text-slate-900 mb-1">
                          {prod.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>SKU: <span className="font-mono">{prod.sku}</span> · Exp: {prod.expiry_date || 'N/A'}</div>
                          <div>Location: {prod.location || 'Storage Bay'}</div>
                          <div>Supplier: {prod.supplier_name}</div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xl font-bold text-slate-900">{prod.current_stock}</span>
                          <span className="text-xs text-slate-500 ml-1">{prod.unit}</span>
                          <span className="text-[10px] text-slate-400 block">(Reorder: {prod.min_stock_alert})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setStockMovementModal({ isOpen: true, product: prod })}
                            className="py-1.5 px-3 text-xs font-semibold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-lg transition-colors"
                          >
                            Log Movement
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Movement History */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h4 className="font-serif font-bold text-sm text-slate-900 mb-3">
                  Stock Movement & Audit Trail
                </h4>
                <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                  {movements.map(m => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{m.product_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {m.movement_type.toUpperCase()} · {m.notes} · by {m.performed_by}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                        <div className="text-[10px] text-slate-400">Balance: {m.balance_after}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 8. STAFF & ROSTERS MODULE */}
          {/* ================================================================= */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Salon Staff, Rosters & Commission Tracking
                  </h3>
                  <span className="text-xs text-slate-500">Manage schedules, assigned skills, and commission percentages</span>
                </div>
                {isManager && (
                  <button
                    onClick={() => setStaffModal({ isOpen: true, data: null })}
                    className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Stylist Profile</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-[#8C235A] bg-[#FAF4F0] px-2 py-0.5 rounded-full">
                          {s.role}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 italic'}`}>
                          {s.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-base text-slate-900">{s.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Phone: +91 {s.phone}</p>

                      <div className="mt-3 p-3 bg-[#FAF7F5] rounded-xl text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Salary Model:</span>
                          <span className="capitalize font-medium">{s.salary_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Commission Rate:</span>
                          <span className="font-bold text-[#5B132B]">{s.commission_rate}% per order</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Hours:</span>
                          <span>{s.working_hours || '10 AM - 8 PM'}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Expertise</span>
                        <div className="flex flex-wrap gap-1">
                          {s.skills.map((skill, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400">Assigned Bookings</span>
                        <span className="font-bold text-slate-900">
                          {appointments.filter(a => a.assigned_staff_id === s.id).length} bookings
                        </span>
                      </div>
                      {isManager && (
                        <button
                          onClick={() => setStaffModal({ isOpen: true, data: s })}
                          className="p-1.5 text-slate-600 hover:text-[#5B132B] hover:bg-[#FAF4F0] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit Stylist Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 9. GALLERY & PORTFOLIO MODULE */}
          {/* ================================================================= */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Artist Portfolio & Works Gallery
                  </h3>
                  <span className="text-xs text-slate-500">Upload bridal transformations, hair art, and approve client showcase items</span>
                </div>
                <button
                  onClick={() => setGalleryModal({ isOpen: true, data: null })}
                  className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Portfolio Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {gallery.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="h-44 bg-slate-100 relative">
                      <div className="w-full h-full bg-gradient-to-tr from-[#3B0E27] to-[#120B0F] flex items-center justify-center text-[#D4AF37]">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_approved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'
                      }`}>
                        {item.is_approved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>

                    <div className="p-4">
                      <h4 className="font-serif font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      <div className="text-[10px] text-slate-400 mt-2">
                        Artist: <strong className="text-slate-700">{item.artist_name || 'Staff'}</strong>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={async () => {
                          await api.updateGalleryItem(item.id, { is_approved: !item.is_approved }, currentUser.name);
                          loadAllData();
                        }}
                        className="text-xs font-semibold text-[#5B132B]"
                      >
                        {item.is_approved ? 'Unpublish' : 'Approve'}
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Delete ${item.title}?`)) {
                            await api.deleteGalleryItem(item.id, currentUser.name);
                            loadAllData();
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 10. REPORTS & ANALYTICS MODULE (Owner & Manager Only) */}
          {/* ================================================================= */}
          {activeTab === 'reports' && (!isOwner && !isManager) && (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto shadow-sm">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">
                Access Restricted
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sales analytics, financial registers, and day-wise revenue breakdowns are strictly restricted to Salon Owners and Managers.
              </p>
            </div>
          )}

          {activeTab === 'reports' && (isOwner || isManager) && (
            <div className="space-y-6">
              {/* Report Header & Filter Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#8C235A] mb-1">
                    <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                      Financial Intelligence & Audit Ledger
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-slate-900">
                    Sales Reports & Analytics
                  </h3>
                  <p className="text-xs text-slate-500">
                    Day-wise and custom date-range sales performance calculated directly from closed billing orders.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    title="Export report to CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-2 px-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    title="Print formatted sales report"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Date Filters Controls */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1">
                    <CalendarRange className="w-4 h-4 text-[#5B132B]" />
                    <span>Period:</span>
                  </span>
                  {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as const).map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => {
                        setReportFilterPeriod(period);
                        loadDetailedReports(period, customStartDate, customEndDate);
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold capitalize transition-all ${
                        reportFilterPeriod === period
                          ? 'bg-[#5B132B] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {period.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {reportFilterPeriod === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => loadDetailedReports('custom', customStartDate, customEndDate)}
                      className="py-1.5 px-3 bg-[#5B132B] text-white rounded-lg text-xs font-bold hover:bg-[#430D1F]"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {loadingReports ? (
                <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#5B132B]" />
                  <span className="text-xs font-semibold">Computing sales & payment aggregates...</span>
                </div>
              ) : detailedReports ? (
                <>
                  {/* Active Window Pill */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <div>
                      Showing records for:{' '}
                      <strong className="text-slate-800 uppercase font-bold tracking-wide">
                        {detailedReports.filter.period.replace('_', ' ')}
                      </strong>{' '}
                      ({detailedReports.filter.startDate} to {detailedReports.filter.endDate})
                    </div>
                    <div>
                      Generated:{' '}
                      <span className="font-mono text-slate-700">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* 8 Primary Financial Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Gross Sales</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-1">
                        ₹{detailedReports.summary.gross_sales.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Total billed order value</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Service Revenue</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-[#5B132B] mt-1">
                        ₹{detailedReports.summary.service_sales.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Salon & bridal treatments</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Retail Product Sales</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-indigo-700 mt-1">
                        ₹{detailedReports.summary.product_sales.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Haircare & skincare retail</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Total Collections</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 mt-1">
                        ₹{detailedReports.summary.total_paid.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Actual cash/UPI/card received</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Discounts Given</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-amber-600 mt-1">
                        ₹{detailedReports.summary.total_discount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Coupons & bill markdowns</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">GST Tax Collected</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-slate-800 mt-1">
                        ₹{detailedReports.summary.tax_gst.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">5% GST component</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Outstanding Dues</span>
                      <div className={`text-xl sm:text-2xl font-serif font-bold mt-1 ${detailedReports.summary.outstanding_due > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        ₹{detailedReports.summary.outstanding_due.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Uncollected balance</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block">Orders & Refunds</span>
                      <div className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-1">
                        {detailedReports.summary.completed_orders} <span className="text-xs font-normal text-slate-500">bills</span>
                      </div>
                      <span className="text-[10px] text-rose-500 mt-1 block">
                        {detailedReports.summary.refunded_count} refunds (₹{detailedReports.summary.total_refund_amount})
                      </span>
                    </div>
                  </div>

                  {/* Payment Modes Breakdown */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <h4 className="font-serif font-bold text-sm text-slate-900 mb-3">
                      Payment Mode Collection Breakdown
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                        <span className="text-slate-500 font-medium block">UPI / QR Codes</span>
                        <div className="font-serif font-bold text-base text-emerald-800 mt-0.5">
                          ₹{detailedReports.payment_breakdown.upi.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                        <span className="text-slate-500 font-medium block">Credit / Debit Card</span>
                        <div className="font-serif font-bold text-base text-blue-800 mt-0.5">
                          ₹{detailedReports.payment_breakdown.card.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                        <span className="text-slate-500 font-medium block">Cash Drawer</span>
                        <div className="font-serif font-bold text-base text-amber-800 mt-0.5">
                          ₹{detailedReports.payment_breakdown.cash.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                        <span className="text-slate-500 font-medium block">Split / Multi-tender</span>
                        <div className="font-serif font-bold text-base text-purple-800 mt-0.5">
                          ₹{detailedReports.payment_breakdown.split.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Day-Wise Sales Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-serif font-bold text-sm text-slate-900">
                        Day-Wise Sales & Collections Register ({detailedReports.day_wise_breakdown.length} days recorded)
                      </h4>
                      <span className="text-[11px] text-slate-400">Values in INR (₹)</span>
                    </div>

                    {detailedReports.day_wise_breakdown.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No sales transactions recorded for this selected time window.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Date</th>
                              <th className="py-2.5 px-3 font-semibold">Orders</th>
                              <th className="py-2.5 px-3 font-semibold">Service (₹)</th>
                              <th className="py-2.5 px-3 font-semibold">Products (₹)</th>
                              <th className="py-2.5 px-3 font-semibold">Discount (₹)</th>
                              <th className="py-2.5 px-3 font-semibold">GST (₹)</th>
                              <th className="py-2.5 px-3 font-semibold">Gross Total (₹)</th>
                              <th className="py-2.5 px-3 font-semibold text-emerald-700">Collected (₹)</th>
                              <th className="py-2.5 px-3 font-semibold text-rose-600">Due (₹)</th>
                              <th className="py-2.5 px-4 font-semibold text-right">Modes Breakdown</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detailedReports.day_wise_breakdown.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                                  {d.formatted_date}
                                  <span className="block text-[10px] font-mono text-slate-400">{d.date}</span>
                                </td>
                                <td className="py-3 px-3 font-medium text-slate-700">{d.orders_count}</td>
                                <td className="py-3 px-3 font-medium text-slate-700">₹{d.service_sales.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 font-medium text-slate-700">₹{d.product_sales.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 text-amber-600 font-medium">₹{d.discount_amount.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 text-slate-500">₹{d.tax_amount.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 font-bold text-slate-900">₹{d.total_sales.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-3 font-bold text-emerald-700">₹{d.paid_amount.toLocaleString('en-IN')}</td>
                                <td className={`py-3 px-3 font-bold ${d.due_amount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                  ₹{d.due_amount.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                  {d.upi_amount > 0 && <span className="mr-1.5 text-emerald-700">UPI: ₹{d.upi_amount}</span>}
                                  {d.card_amount > 0 && <span className="mr-1.5 text-blue-700">Card: ₹{d.card_amount}</span>}
                                  {d.cash_amount > 0 && <span className="mr-1.5 text-amber-700">Cash: ₹{d.cash_amount}</span>}
                                  {d.split_amount > 0 && <span className="text-purple-700">Split: ₹{d.split_amount}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Staff Performance Breakdown Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <h4 className="font-serif font-bold text-sm text-slate-900 mb-3">
                      Stylist & Staff Performance (Services & Commission)
                    </h4>
                    {detailedReports.staff_performance.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No service assignments recorded for this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Staff Member</th>
                              <th className="py-2.5 px-3 font-semibold">Role</th>
                              <th className="py-2.5 px-3 font-semibold">Services Completed</th>
                              <th className="py-2.5 px-3 font-semibold">Service Revenue (₹)</th>
                              <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">Commission Earned (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detailedReports.staff_performance.map((st, i) => (
                              <tr key={i} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-4 font-bold text-slate-900">{st.staff_name}</td>
                                <td className="py-2.5 px-3 text-slate-500 uppercase text-[10px] font-semibold">{st.role}</td>
                                <td className="py-2.5 px-3 text-slate-700">{st.services_count} services</td>
                                <td className="py-2.5 px-3 font-bold text-[#5B132B]">₹{st.service_revenue.toLocaleString('en-IN')}</td>
                                <td className="py-2.5 px-4 text-right font-bold text-emerald-700">₹{st.commission_earned.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ================================================================= */}
          {/* 11. PRINT DEVICES & AUTO-PRINTING (MOZZ) */}
          {/* ================================================================= */}
          {activeTab === 'printers' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#120B0F] to-[#3B0E27] text-white p-6 rounded-3xl shadow-sm border border-[#D4AF37]/30">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-[#D4AF37] mb-1">
                    <Printer className="w-5 h-5" />
                    <span className="text-xs uppercase font-bold tracking-widest">
                      MOZZ PrintProvider Architecture
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl mb-2">
                    Salon Desktop Hardware Print Agent
                  </h3>
                  <p className="text-xs text-white/80 leading-relaxed">
                    Auto-printing dispatches ESC/POS thermal bills on receipt creation and queues service ticket slips to stylist stations.
                  </p>
                </div>
              </div>

              {/* Connected Devices */}
              <div>
                <h4 className="font-serif font-bold text-sm text-slate-900 mb-3">
                  Registered Salon Print Devices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {printDevices.map(dev => (
                    <div key={dev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-[#5B132B]">{dev.device_id}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>Online</span>
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-base text-slate-900">{dev.device_name}</h4>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                          <div>Hardware: <strong>{dev.printer_name}</strong> ({dev.paper_size || '80mm'})</div>
                          <div>Location: {dev.branch}</div>
                          <div>Heartbeat: {new Date(dev.last_heartbeat).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600">Auto-Print Bills:</span>
                        <span className="font-bold text-emerald-700">{dev.auto_print_bill ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Queue */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif font-bold text-sm text-slate-900">
                    Live Print Queue & Statuses
                  </h4>
                  <span className="text-xs text-slate-500">{printJobs.length} jobs in queue</span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {printJobs.map(job => (
                    <div key={job.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{job.id}</span>
                          <span className="uppercase text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {job.job_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Target: {job.payload?.customer_name || 'Front Desk'} · {job.payload?.bill_number || job.payload?.booking_reference || 'Ref'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'Printed' ? 'bg-emerald-100 text-emerald-800' :
                          job.status === 'Printing' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {job.status}
                        </span>
                        <button
                          onClick={() => {
                            if (job.job_type === 'bill') {
                              const ord = orders.find(o => o.id === job.order_id);
                              onViewReceipt(ord || orders[0], undefined, 'bill');
                            } else {
                              const apt = appointments.find(a => a.id === job.appointment_id);
                              onViewReceipt(undefined, apt || appointments[0], 'service_ticket');
                            }
                          }}
                          className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          Reprint
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 12. ADMIN SETTINGS: WHATSAPP, RBAC & AUDIT LOGS */}
          {/* ================================================================= */}
          {activeTab === 'settings' && (isOwner || isManager) && (
            <div className="space-y-6">
              {/* Settings Sub-navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('whatsapp')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      settingsSubTab === 'whatsapp'
                        ? 'bg-[#5B132B] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp Integration</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('users')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          settingsSubTab === 'users'
                            ? 'bg-[#5B132B] text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Staff Accounts & RBAC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('audit')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          settingsSubTab === 'audit'
                            ? 'bg-[#5B132B] text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Security Audit Trail</span>
                      </button>
                    </>
                  )}
                </div>

                {isOwner && settingsSubTab === 'users' && (
                  <button
                    onClick={() => setUserModal({ isOpen: true, data: null })}
                    className="py-1.5 px-3 bg-[#5B132B] hover:bg-[#430D1F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Staff User</span>
                  </button>
                )}
              </div>

              {/* Sub-tab 1: WhatsApp Business Coexistence Integration */}
              {settingsSubTab === 'whatsapp' && (
                <WhatsAppIntegrationSection
                  currentUserName={currentUser.name}
                  currentUserId={currentUser.id}
                  isOwner={isOwner}
                  isManager={isManager}
                  assignedBranchId={currentUser.branch_id}
                />
              )}

              {/* Sub-tab 2: Staff Accounts & RBAC */}
              {settingsSubTab === 'users' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[#8C235A] mb-0.5">
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">
                          Owner Security Controls
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-base text-slate-900">
                        Staff Accounts & Role-Based Access Control (RBAC)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Create staff User IDs, set/reset passwords, assign module permissions, and manage credentials.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">User ID</th>
                          <th className="py-2.5 px-3 font-semibold">Staff Name & Contact</th>
                          <th className="py-2.5 px-3 font-semibold">Assigned Role</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Last Login</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Owner Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#5B132B]">
                              <span className="bg-[#FAF4F0] px-2 py-1 rounded-md border border-[#EBD9D0]">
                                {user.user_id || 'TGL-STF'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{user.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {user.email} · {user.phone || 'No phone'}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'owner' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                user.role === 'manager' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                                user.role === 'receptionist' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                user.role === 'stylist' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                'bg-orange-100 text-orange-900 border border-orange-300'
                              }`}>
                                {user.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                user.is_active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                <span>{user.is_active ? 'Active' : 'Deactivated'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-500">
                              {user.last_login_at
                                ? new Date(user.last_login_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Never logged in'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setUserModal({ isOpen: true, data: user })}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                  title="Edit Staff Profile & Role"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setResetPasswordModal({ isOpen: true, user })}
                                  className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg flex items-center gap-1 font-semibold text-[11px]"
                                  title="Reset Staff Password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                  <span>Reset Pwd</span>
                                </button>
                                {user.role !== 'owner' && (
                                  <button
                                    onClick={() => setDeactivateConfirmModal({
                                      isOpen: true,
                                      user,
                                      action: user.is_active ? 'toggle' : 'toggle'
                                    })}
                                    className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                                      user.is_active
                                        ? 'text-rose-700 hover:bg-rose-50'
                                        : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {user.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Security Audit Trail */}
              {settingsSubTab === 'audit' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Security & Audit Trail Log
                    </h3>
                    <span className="text-xs text-slate-400">Immutable chronological event record</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
                    {auditLogs.map(log => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-[#8C235A] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 mr-2">
                            {log.action}
                          </span>
                          <span className="text-slate-800 font-medium">{log.details}</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Actor: <strong>{log.performed_by}</strong> · {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: STOCK ADJUSTMENT */}
      {stockMovementModal.isOpen && stockMovementModal.product && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRecordStockMovement} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-3 text-xs">
            <h3 className="font-serif font-bold text-base text-slate-900 mb-1">
              Record Stock Movement
            </h3>
            <p className="text-xs text-slate-500 mb-2">{stockMovementModal.product.name} (Stock: {stockMovementModal.product.current_stock})</p>

            <div>
              <label className="block font-semibold mb-1">Movement Type</label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              >
                <option value="stock_in">Stock-In (Supplier Purchase)</option>
                <option value="stock_out">Stock-Out (Retail Sale)</option>
                <option value="damaged">Damaged / Wastage</option>
                <option value="service_usage">Service Usage</option>
                <option value="adjustment">Manual Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Quantity ({stockMovementModal.product.unit})</label>
              <input
                type="number"
                min={1}
                required
                value={stockQty}
                onChange={e => setStockQty(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Reason / Notes</label>
              <input
                type="text"
                value={stockNotes}
                onChange={e => setStockNotes(e.target.value)}
                placeholder="e.g. Monthly restock or damaged vial"
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold text-white bg-[#5B132B] rounded-xl hover:bg-[#430D1F]"
              >
                Confirm Movement
              </button>
              <button
                type="button"
                onClick={() => setStockMovementModal({ isOpen: false })}
                className="py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CUSTOMER CREATE/EDIT */}
      {customerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const name = form.name.value.trim();
              const rawMobile = form.mobile.value.trim();
              const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
              if (cleanMobile.length !== 10) {
                alert('Please enter a valid 10-digit mobile number.');
                return;
              }
              const email = form.email.value.trim() || undefined;
              const branch_id = form.branch_id.value || undefined;
              const status = form.status.value || 'active';
              const birthday = form.birthday.value || undefined;
              const allergies = form.allergies.value.trim() || undefined;
              const notes = form.notes.value.trim() || undefined;

              try {
                if (customerModal.data) {
                  await api.updateCustomer(customerModal.data.id, {
                    name,
                    mobile: cleanMobile,
                    email,
                    branch_id,
                    status,
                    birthday,
                    allergies,
                    notes
                  }, currentUser.name);
                } else {
                  await api.createCustomer({
                    name,
                    mobile: cleanMobile,
                    email,
                    branch_id,
                    status,
                    birthday,
                    allergies,
                    notes,
                    loyalty_points: 0,
                    total_spend: 0,
                    visit_count: 1
                  }, currentUser.name);
                }
                setCustomerModal({ isOpen: false });
                await loadAllData();
              } catch (err: any) {
                alert('Failed to save customer: ' + (err.message || 'Unknown error'));
              }
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-slate-900">
                {customerModal.data ? 'Edit Customer Profile' : 'Add Walk-in Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomerModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={customerModal.data?.name || ''}
                placeholder="e.g. Priyamvada Rao"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Mobile (10 digits) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">+91</span>
                  <input
                    name="mobile"
                    type="tel"
                    required
                    maxLength={10}
                    defaultValue={customerModal.data?.mobile ? customerModal.data.mobile.replace(/\D/g, '').slice(-10) : ''}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Email Address</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customerModal.data?.email || ''}
                  placeholder="client@example.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Assigned Branch *</label>
                <select
                  name="branch_id"
                  defaultValue={customerModal.data?.branch_id || branches[0]?.id || 'tgl-gachibowli-main'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Customer Status</label>
                <select
                  name="status"
                  defaultValue={customerModal.data?.status || 'active'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20 cursor-pointer"
                >
                  <option value="active">Active Regular</option>
                  <option value="vip">VIP Guest</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Birthday</label>
                <input
                  name="birthday"
                  type="date"
                  defaultValue={customerModal.data?.birthday || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-rose-700">Allergies / Notes</label>
                <input
                  name="allergies"
                  type="text"
                  defaultValue={customerModal.data?.allergies || ''}
                  placeholder="e.g. Ammonia sensitivity"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Internal Salon Notes</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={customerModal.data?.notes || ''}
                placeholder="Preferred stylist, beverage choice, service history notes..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Save Customer to Supabase
              </button>
              <button
                type="button"
                onClick={() => setCustomerModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SERVICE CREATE/EDIT */}
      {serviceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const name = form.name.value;
              const category_id = form.category_id.value;
              const duration_minutes = Number(form.duration.value);
              const price = Number(form.price.value);
              const discount_price = form.discount_price.value ? Number(form.discount_price.value) : undefined;
              const description = form.description.value;
              const benefits = form.benefits.value;

              if (serviceModal.data) {
                await api.updateService(serviceModal.data.id, { name, category_id, duration_minutes, price, discount_price, description, benefits }, currentUser.name);
              } else {
                await api.createService({ name, slug: name.toLowerCase().replace(/\s+/g, '-'), category_id, duration_minutes, price, discount_price, description, benefits, is_active: true, image_url: '/services/default.jpg' }, currentUser.name);
              }
              setServiceModal({ isOpen: false });
              loadAllData();
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-3 text-xs"
          >
            <h3 className="font-serif font-bold text-base text-slate-900">
              {serviceModal.data ? 'Edit Service' : 'Add New Service'}
            </h3>
            <div>
              <label className="block font-semibold mb-1">Service Name *</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={serviceModal.data?.name || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Category *</label>
              <select
                name="category_id"
                defaultValue={serviceModal.data?.category_id || categories[0]?.id}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold mb-1">Duration (m)</label>
                <input
                  name="duration"
                  type="number"
                  required
                  defaultValue={serviceModal.data?.duration_minutes || 45}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Price (₹)</label>
                <input
                  name="price"
                  type="number"
                  required
                  defaultValue={serviceModal.data?.price || 1500}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Offer Price</label>
                <input
                  name="discount_price"
                  type="number"
                  defaultValue={serviceModal.data?.discount_price || ''}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={serviceModal.data?.description || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Key Benefits / Highlights</label>
              <input
                name="benefits"
                type="text"
                defaultValue={serviceModal.data?.benefits || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold text-white bg-[#5B132B] rounded-xl"
              >
                Save Service
              </button>
              <button
                type="button"
                onClick={() => setServiceModal({ isOpen: false })}
                className="py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GALLERY UPLOAD */}
      {galleryModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const title = form.title.value;
              const category = form.category.value;
              const artist_name = form.artist_name.value;
              const description = form.description.value;

              await api.createGalleryItem({
                title,
                category,
                artist_name,
                description,
                image_url: '/gallery/new-upload.jpg',
                is_approved: isManager,
                display_order: gallery.length + 1
              }, currentUser.name);

              setGalleryModal({ isOpen: false });
              loadAllData();
            }}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-3 text-xs"
          >
            <h3 className="font-serif font-bold text-base text-slate-900">Upload Portfolio Art</h3>
            <div>
              <label className="block font-semibold mb-1">Title *</label>
              <input name="title" required type="text" className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <select name="category" className="w-full p-2 bg-slate-50 border rounded-lg">
                <option value="Bridal Makeup">Bridal Makeup</option>
                <option value="Party Makeup">Party Makeup</option>
                <option value="Hair Styling">Hair Styling</option>
                <option value="Saree & Hair">Saree & Hair</option>
                <option value="Skin Care">Skin Care</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Stylist / Artist Name</label>
              <input name="artist_name" defaultValue={currentUser.name} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Caption / Description</label>
              <textarea name="description" rows={2} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 text-xs font-bold text-white bg-[#5B132B] rounded-xl">
                Upload Artwork
              </button>
              <button type="button" onClick={() => setGalleryModal({ isOpen: false })} className="py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: STYLIST & STAFF PROFILE */}
      {staffModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              const name = (formData.get('name') as string)?.trim();
              const phone = (formData.get('phone') as string)?.trim();
              const email = (formData.get('email') as string)?.trim();
              const role = (formData.get('role') as string)?.trim() || 'stylist';
              const commission_rate = Number(formData.get('commission_rate') || 10);
              const working_hours = (formData.get('working_hours') as string)?.trim() || '10:00 AM - 08:00 PM';
              const skillsStr = (formData.get('skills') as string) || '';
              const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
              const is_active = formData.get('is_active') === 'true';

              try {
                if (staffModal.data?.id) {
                  await api.updateStaff(staffModal.data.id, {
                    name,
                    phone,
                    email,
                    role,
                    commission_rate,
                    working_hours,
                    skills,
                    is_active
                  }, currentUser.name);
                } else {
                  await api.createStaff({
                    name,
                    phone,
                    email,
                    role,
                    salary_type: 'commission',
                    commission_rate,
                    working_hours,
                    skills,
                    is_active: true
                  } as any, currentUser.name);
                }
                setStaffModal({ isOpen: false });
                await loadAllData();
              } catch (err: any) {
                alert(err.message || 'Failed to save staff profile.');
              }
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-3.5 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900">
                  {staffModal.data ? 'Edit Staff & Stylist Profile' : 'Add New Stylist Profile'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Changes automatically synchronize across Bookings, POS, and Reports
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStaffModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
              <input
                name="name"
                required
                defaultValue={staffModal.data?.name || ''}
                placeholder="e.g. Madu Mounika"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Phone Number *</label>
                <input
                  name="phone"
                  required
                  defaultValue={staffModal.data?.phone || ''}
                  placeholder="10-digit mobile"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Email Address</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={staffModal.data?.email || ''}
                  placeholder="staff@theglossylooks.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Role / Designation *</label>
                <input
                  name="role"
                  required
                  defaultValue={staffModal.data?.role || 'stylist'}
                  placeholder="e.g. stylist, manager, receptionist"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Commission Rate (%)</label>
                <input
                  name="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={staffModal.data?.commission_rate ?? 10}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Working Hours</label>
              <input
                name="working_hours"
                defaultValue={staffModal.data?.working_hours || '10:00 AM - 08:00 PM'}
                placeholder="e.g. 10:00 AM - 08:00 PM"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Skills / Expertise (Comma separated)</label>
              <input
                name="skills"
                defaultValue={staffModal.data?.skills?.join(', ') || 'Hair Styling, Makeup'}
                placeholder="e.g. Bridal Makeup, HD Airbrush, Hair Botox"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            {staffModal.data && (
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Staff Status</label>
                <select
                  name="is_active"
                  defaultValue={staffModal.data.is_active ? 'true' : 'false'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                >
                  <option value="true">Active (Available for Appointments & POS)</option>
                  <option value="false">Deactivated (Hidden from new bookings & bills)</option>
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl shadow-xs transition-colors"
              >
                {staffModal.data ? 'Save Profile Changes' : 'Create Stylist'}
              </button>
              <button
                type="button"
                onClick={() => setStaffModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: OWNER ADD/EDIT STAFF USER */}
      {userModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAdminUser}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-3.5 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900">
                  {userModal.data ? 'Edit Staff User Account' : 'Add New Staff User'}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Owner Access Control · The Glossy Looks
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUserModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Staff User ID *</label>
                <input
                  name="user_id"
                  required
                  defaultValue={userModal.data?.user_id || ''}
                  placeholder="e.g. TGL-STF05"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Assigned Role *</label>
                <select
                  name="role"
                  defaultValue={userModal.data?.role || 'receptionist'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                >
                  <option value="owner">Owner (Full Admin Access)</option>
                  <option value="manager">Manager (Operations & Reports)</option>
                  <option value="receptionist">Receptionist / Cashier (POS & Bookings)</option>
                  <option value="stylist">Stylist / Makeup Artist (Service Queue)</option>
                  <option value="inventory_staff">Inventory Staff (Stock Levels)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
              <input
                name="name"
                required
                defaultValue={userModal.data?.name || ''}
                placeholder="e.g. Rohini Iyer"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Email Address *</label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={userModal.data?.email || ''}
                  placeholder="staff@theglossylooks.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Mobile Phone *</label>
                <input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={userModal.data?.phone || ''}
                  placeholder="9848012345"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
              </div>
            </div>

            {!userModal.data ? (
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Initial Password *</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Passwords are encrypted using secure hashing. Staff can change password via Owner reset.
                </p>
              </div>
            ) : (
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Account Status</label>
                <select
                  name="is_active"
                  defaultValue={userModal.data.is_active ? 'true' : 'false'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
                >
                  <option value="true">Active (Can log in)</option>
                  <option value="false">Deactivated (Login blocked)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  To reset this user's password, use the "Reset Pwd" button in the staff list.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl shadow-xs transition-colors"
              >
                {userModal.data ? 'Update Staff User' : 'Create Staff User'}
              </button>
              <button
                type="button"
                onClick={() => setUserModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: OWNER RESET PASSWORD */}
      {resetPasswordModal.isOpen && resetPasswordModal.user && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleResetAdminPassword}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Reset Staff Password</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  {resetPasswordModal.user.name} ({resetPasswordModal.user.user_id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                As Salon Owner, setting a new password will immediately override the current password. Existing passwords cannot be viewed in plain text.
              </span>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">New Password *</label>
              <input
                name="new_password"
                type="password"
                required
                minLength={6}
                placeholder="Enter new password (min 6 chars)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">Confirm New Password *</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="Re-type new password"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none focus:border-[#5B132B]"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
              >
                Set New Password
              </button>
              <button
                type="button"
                onClick={() => setResetPasswordModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CONFIRM DEACTIVATE / ACTIVATE USER */}
      {deactivateConfirmModal.isOpen && deactivateConfirmModal.user && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-xs text-center">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
              deactivateConfirmModal.user.is_active ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-slate-900">
                {deactivateConfirmModal.user.is_active ? 'Deactivate Staff User?' : 'Reactivate Staff User?'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {deactivateConfirmModal.user.is_active ? (
                  <>
                    Are you sure you want to deactivate <strong>{deactivateConfirmModal.user.name}</strong> ({deactivateConfirmModal.user.user_id})? They will immediately lose access to the portal.
                  </>
                ) : (
                  <>
                    Reactivate <strong>{deactivateConfirmModal.user.name}</strong> ({deactivateConfirmModal.user.user_id}) to restore their login access.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmUserStatusToggle}
                className={`flex-1 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                  deactivateConfirmModal.user.is_active
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {deactivateConfirmModal.user.is_active ? 'Yes, Deactivate' : 'Yes, Reactivate'}
              </button>
              <button
                type="button"
                onClick={() => setDeactivateConfirmModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP APPOINTMENT CONFIRMATION DIALOG */}
      {whatsAppConfirmModal.isOpen && whatsAppConfirmModal.appointment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                    Send WhatsApp Appointment Confirmation
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Meta Template: gl_appointment_confirmation (en_US)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppConfirmModal({ isOpen: false, appointment: null })}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Appointment Details Summary */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold text-slate-500">Booking Reference:</span>
                <span className="font-mono font-bold text-[#5B132B]">{whatsAppConfirmModal.appointment.booking_reference}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{whatsAppConfirmModal.appointment.customer_name} (+91 {whatsAppConfirmModal.appointment.customer_phone})</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold text-slate-500">Date & Slot:</span>
                <span className="font-semibold text-slate-800">{whatsAppConfirmModal.appointment.appointment_date} at {whatsAppConfirmModal.appointment.time_slot}</span>
              </div>
              <div className="flex justify-between items-start text-slate-700">
                <span className="font-semibold text-slate-500">Booked Services:</span>
                <span className="text-right max-w-xs font-medium text-slate-800">
                  {whatsAppConfirmModal.appointment.services.map(s => s.name).join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-700">
                <span className="font-semibold text-slate-500">Sender WhatsApp Number:</span>
                <span className="font-mono font-bold text-emerald-800">+91 89857 99459 (THE GLOSSY LOOKS)</span>
              </div>
            </div>

            {/* Duplicate Prevention Warning */}
            {whatsAppConfirmModal.appointment.last_whatsapp_sent_at && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Confirmation Previously Sent</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Last sent on {new Date(whatsAppConfirmModal.appointment.last_whatsapp_sent_at).toLocaleDateString()} at {new Date(whatsAppConfirmModal.appointment.last_whatsapp_sent_at).toLocaleTimeString()} (Status: {whatsAppConfirmModal.appointment.whatsapp_status || 'Sent'}).
                  </p>
                </div>
              </div>
            )}

            {/* Action Result / Diagnostics Display */}
            {whatsAppSendResult && (
              <div className={`p-3 rounded-xl border text-xs ${
                whatsAppSendResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : whatsAppSendResult.status === 'pending_approval'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {whatsAppSendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : whatsAppSendResult.status === 'pending_approval' ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {whatsAppSendResult.success
                      ? 'WhatsApp Template Dispatched Successfully!'
                      : whatsAppSendResult.status === 'pending_approval'
                      ? 'Status: Pending Meta Approval'
                      : 'Delivery Failed'}
                  </span>
                </div>
                {whatsAppSendResult.message_id && (
                  <p className="mt-1 font-mono text-[11px]">Meta Message ID: {whatsAppSendResult.message_id}</p>
                )}
                {whatsAppSendResult.error && (
                  <p className="mt-1 text-[11px] leading-relaxed">{whatsAppSendResult.error}</p>
                )}
                {whatsAppSendResult.warning && (
                  <p className="mt-1 text-[11px] leading-relaxed">{whatsAppSendResult.warning}</p>
                )}
                {whatsAppSendResult.diagnostics && (
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">{whatsAppSendResult.diagnostics}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={() => {
                  const apt = whatsAppConfirmModal.appointment;
                  setWhatsAppConfirmModal({ isOpen: false, appointment: null });
                  if (apt) handleViewAppointmentLogs(apt);
                }}
                className="py-2.5 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                View History Logs
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsAppConfirmModal({ isOpen: false, appointment: null })}
                  className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={whatsAppSending}
                  onClick={() => handleSendWhatsAppConfirm(Boolean(whatsAppConfirmModal.appointment?.last_whatsapp_sent_at || whatsAppSendResult?.duplicate_prevented))}
                  className="py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {whatsAppSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending via Meta...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>
                        {whatsAppConfirmModal.appointment?.last_whatsapp_sent_at || whatsAppSendResult?.duplicate_prevented
                          ? 'Send Again (Force)'
                          : 'Send WhatsApp Confirmation'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPOINTMENT WHATSAPP MESSAGE LOGS */}
      {appointmentLogsModal.isOpen && appointmentLogsModal.appointment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <MessageCircle className="w-4 h-4 text-[#5B132B]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                    WhatsApp Message Logs & Delivery History
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Ref: {appointmentLogsModal.appointment.booking_reference} · {appointmentLogsModal.appointment.customer_name} ({appointmentLogsModal.appointment.customer_phone})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppointmentLogsModal({ isOpen: false, appointment: null, logs: [], loading: false })}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {appointmentLogsModal.loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5B132B]" />
                <p>Loading WhatsApp delivery logs...</p>
              </div>
            ) : appointmentLogsModal.logs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                <p>No WhatsApp message logs recorded yet for this appointment.</p>
                <button
                  type="button"
                  onClick={() => {
                    const apt = appointmentLogsModal.appointment;
                    setAppointmentLogsModal({ isOpen: false, appointment: null, logs: [], loading: false });
                    if (apt) handleOpenWhatsAppConfirm(apt);
                  }}
                  className="mt-3 py-1.5 px-3 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                >
                  Send Confirmation Now
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {appointmentLogsModal.logs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-[11px]">{log.template_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'delivered' ? 'bg-teal-100 text-teal-800' :
                        log.status === 'read' ? 'bg-blue-100 text-blue-800' :
                        log.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Recipient:</span>
                        <span className="font-mono font-medium">{log.recipient_number}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Sent At:</span>
                        <span>{log.sent_at ? new Date(log.sent_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      {log.delivered_at && (
                        <div>
                          <span className="text-slate-400 block">Delivered At:</span>
                          <span className="text-teal-700 font-medium">{new Date(log.delivered_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {log.read_at && (
                        <div>
                          <span className="text-slate-400 block">Read At:</span>
                          <span className="text-blue-700 font-medium">{new Date(log.read_at).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {log.meta_message_id && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Meta Message ID:</span>
                          <span className="font-mono text-[10px] text-slate-800">{log.meta_message_id}</span>
                        </div>
                      )}
                    </div>

                    {log.error_message && (
                      <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px]">
                        <strong>Error:</strong> {log.error_message}
                      </div>
                    )}
                    {log.diagnostics && (
                      <p className="text-[10px] text-slate-400 font-mono">{log.diagnostics}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAppointmentLogsModal({ isOpen: false, appointment: null, logs: [], loading: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER EXPERIENCE FEEDBACK & CARE RESPONSES */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4 text-[#5B132B]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                    Customer Experience Feedback & 24h Responses
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Real responses collected via Meta WhatsApp Template (glossylooks_customer_feedback)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {feedbackList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500">
                <p className="font-semibold text-slate-700">No customer feedback replies recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Feedback is automatically requested 1 hour after service completion. You can also simulate test replies in the WhatsApp Integration section.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {feedbackList.map(item => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      item.rating === 'good'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : item.rating === 'average'
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.rating === 'good'
                            ? 'bg-emerald-600 text-white'
                            : item.rating === 'average'
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}>
                          Rating: {item.rating}
                        </span>
                        <span className="font-bold text-slate-900">{item.customer_name}</span>
                        <span className="text-slate-500 font-mono text-[11px]">({item.customer_phone})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.received_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-white/70 p-2 rounded-xl border border-slate-100">
                      <strong>Customer Reply:</strong> &ldquo;{item.reply_text || item.rating.toUpperCase()}&rdquo;
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">
                        {item.rating === 'good' ? (
                          <span className="text-emerald-700 font-medium">✓ Auto-reply sent with Google Review link</span>
                        ) : (
                          <span className="text-amber-800 font-medium">⚠️ Salon manager follow-up required</span>
                        )}
                      </span>

                      {!item.is_read ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.markFeedbackRead(item.id);
                            const updated = await api.getAppointmentFeedback();
                            setFeedbackList(updated);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg border text-[10px] shadow-xs"
                        >
                          Mark as Resolved
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER DETAILS (Full Line Items, Stylists & Pricing) */}
      {orderDetailsModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF4F0] text-[#5B132B] flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                    Order Details & Invoice Breakdown
                  </h3>
                  <span className="font-mono text-xs font-bold text-[#5B132B]">
                    {orderDetailsModal.order?.bill_number || orderDetailsModal.payment?.bill_number}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderDetailsModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Transaction Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                <span className="font-bold text-slate-900 block truncate">
                  {orderDetailsModal.order?.customer_name || orderDetailsModal.payment?.customer_name}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  +91 {orderDetailsModal.order?.customer_phone || orderDetailsModal.payment?.customer_phone}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Date & Time (IST)</span>
                <span className="font-medium text-slate-800 text-[11px] block">
                  {formatKolkataDateTime(orderDetailsModal.order?.created_at || orderDetailsModal.payment?.created_at)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payment Mode</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                  {orderDetailsModal.order?.primary_payment_mode || orderDetailsModal.payment?.payment_mode}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (orderDetailsModal.order?.payment_status === 'Paid' || orderDetailsModal.payment?.status === 'Success')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {orderDetailsModal.order?.payment_status || orderDetailsModal.payment?.status}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Itemized Services & Products</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item / Service</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Assigned Stylist</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(orderDetailsModal.order?.items && orderDetailsModal.order.items.length > 0) ? (
                      orderDetailsModal.order.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900">{it.item_name}</td>
                          <td className="p-2.5 capitalize text-slate-500">{it.item_type}</td>
                          <td className="p-2.5 text-slate-700">{it.staff_name || 'Assigned Stylist'}</td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right text-slate-600">₹{it.unit_price}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">₹{it.total_price}</td>
                        </tr>
                      ))
                    ) : orderDetailsModal.payment?.items && orderDetailsModal.payment.items.length > 0 ? (
                      orderDetailsModal.payment.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900">{it.item_name}</td>
                          <td className="p-2.5 capitalize text-slate-500">{it.item_type}</td>
                          <td className="p-2.5 text-slate-700">{it.staff_name || 'Assigned Stylist'}</td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-right text-slate-600">₹{it.unit_price}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">₹{it.total_price}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">
                          Salon Service / Retail Transaction (Bill: {orderDetailsModal.order?.bill_number || orderDetailsModal.payment?.bill_number})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-[#FAF7F5] p-4 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">
                  ₹{Number(orderDetailsModal.order?.subtotal ?? orderDetailsModal.payment?.subtotal ?? orderDetailsModal.payment?.amount ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Discount:</span>
                <span className="font-semibold">
                  - ₹{Number(orderDetailsModal.order?.discount ?? orderDetailsModal.payment?.discount ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5%):</span>
                <span className="font-semibold text-slate-800">
                  ₹{Number(orderDetailsModal.order?.tax_amount ?? orderDetailsModal.payment?.tax_amount ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#5B132B] pt-2 border-t border-slate-200">
                <span>Grand Total Paid:</span>
                <span>
                  ₹{Number(orderDetailsModal.order?.grand_total ?? orderDetailsModal.payment?.amount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onViewReceipt(orderDetailsModal.order || undefined, undefined, 'bill');
                }}
                className="py-2.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Reprint Thermal Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderDetailsModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ORDER (Owner/Manager Role Protected) */}
      {orderEditModal.isOpen && (isOwner || isManager) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const orderId = orderEditModal.order?.id || orderEditModal.payment?.order_id;
              if (!orderId) {
                setOrderEditError('Order reference ID not found.');
                return;
              }
              setOrderEditSaving(true);
              setOrderEditError(null);
              try {
                await api.updateOrder(orderId, {
                  customer_name: editOrderCustomerName.trim(),
                  customer_phone: editOrderCustomerPhone.trim(),
                  primary_payment_mode: editOrderPaymentMode,
                  discount: Number(editOrderDiscount || 0),
                  payment_status: editOrderPaymentStatus,
                  notes: editOrderNotes.trim()
                }, currentUser.name);

                setOrderEditModal({ isOpen: false });
                await loadAllData();
              } catch (err: any) {
                setOrderEditError(err.message || 'Failed to update order');
              } finally {
                setOrderEditSaving(false);
              }
            }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                    Edit Order & Settlement Details
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Role-Protected Audit Action · Salon Owner / Manager
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderEditModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderEditError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{orderEditError}</span>
              </div>
            )}

            {/* Immutable Bill Number Notice */}
            <div>
              <label className="block font-semibold mb-1 text-slate-500">Bill Number (Immutable)</label>
              <input
                type="text"
                readOnly
                disabled
                value={orderEditModal.order?.bill_number || orderEditModal.payment?.bill_number || ''}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 cursor-not-allowed"
                title="Bill numbers are legally immutable and cannot be edited"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Bill number is preserved permanently for accounting integrity.
              </span>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editOrderCustomerName}
                  onChange={e => setEditOrderCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Customer Phone *</label>
                <input
                  type="tel"
                  required
                  value={editOrderCustomerPhone}
                  onChange={e => setEditOrderCustomerPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
                />
              </div>
            </div>

            {/* Payment Mode & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Payment Mode *</label>
                <select
                  value={editOrderPaymentMode}
                  onChange={e => setEditOrderPaymentMode(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white cursor-pointer"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                  <option value="Cash">Cash Counter</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                  <option value="Split Payment">Split Payment</option>
                  <option value="Pay Later">Pay Later</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Payment Status *</label>
                <select
                  value={editOrderPaymentStatus}
                  onChange={e => setEditOrderPaymentStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white cursor-pointer"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Discount & Live Totals Calculation */}
            {(() => {
              const subtotal = orderEditModal.order?.subtotal ?? orderEditModal.payment?.subtotal ?? orderEditModal.payment?.amount ?? 0;
              const discount = Math.max(0, Number(editOrderDiscount || 0));
              const taxable = Math.max(0, subtotal - discount);
              const tax = Math.round(taxable * 0.05);
              const calculatedTotal = taxable + tax;

              return (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Discount Amount (₹):</label>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={editOrderDiscount}
                      onChange={e => setEditOrderDiscount(Number(e.target.value))}
                      className="w-28 p-1.5 text-right bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{Number(subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Discount:</span>
                      <span>- ₹{Number(discount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-calculated GST (5%):</span>
                      <span>₹{Number(tax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-[#5B132B] pt-1 border-t border-slate-200">
                      <span>Recalculated Grand Total:</span>
                      <span>₹{Number(calculatedTotal).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Order Notes */}
            <div>
              <label className="block font-semibold mb-1 text-slate-700">Audit Notes / Reason for Edit</label>
              <textarea
                rows={2}
                value={editOrderNotes}
                onChange={e => setEditOrderNotes(e.target.value)}
                placeholder="e.g. Corrected payment mode from Cash to UPI per bank statement"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B132B]/20"
              />
            </div>

            <div className="text-[10px] text-slate-400 bg-[#FAF7F5] p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All edits are automatically logged into the tamper-evident security audit log with user actor, previous values, and new values.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={orderEditSaving}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {orderEditSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <span>Save Order & Ledger Updates</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOrderEditModal({ isOpen: false })}
                className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
