/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Complete The Glossy Looks Admin & Salon Operations Portal
 * Role-Based Access Control (RBAC), Protected Login, Full 11 CRUD Modules,
 * POS Billing, CRM, Inventory Movements, Print Provider & Audit Logging.
 */

import React, { useState, useEffect } from 'react';
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
  MessageSquare
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
  AppointmentFeedback
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

  // POS State
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posSelectedItems, setPosSelectedItems] = useState<Array<{ service: ServiceItem; quantity: number; staffId?: string }>>([]);
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posTip, setPosTip] = useState<number>(0);
  const [posPaymentMode, setPosPaymentMode] = useState<Order['primary_payment_mode']>('UPI');
  const [posNotes, setPosNotes] = useState('');
  const [posSuccessOrder, setPosSuccessOrder] = useState<Order | null>(null);
  const [posFeedbackSending, setPosFeedbackSending] = useState(false);
  const [posFeedbackMessage, setPosFeedbackMessage] = useState<string | null>(null);

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
        settingsData
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
        api.getSettings()
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
    if (!posCustomerName || !posCustomerPhone || posSelectedItems.length === 0) {
      alert('Please specify customer and at least one service/product');
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

    try {
      const newOrder = await api.createOrder({
        customer_name: posCustomerName,
        customer_phone: posCustomerPhone,
        items,
        subtotal,
        discount: posDiscount,
        tax_amount: tax,
        tip_amount: posTip,
        grand_total: grandTotal,
        paid_amount: grandTotal,
        payment_status: 'Paid',
        primary_payment_mode: posPaymentMode,
        cashier_name: currentUser?.name || 'Reception',
        notes: posNotes
      }, currentUser?.name);

      setPosSuccessOrder(newOrder);
      setPosFeedbackMessage(null);
      setPosSelectedItems([]);
      setPosDiscount(0);
      setPosTip(0);
      setPosNotes('');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error executing POS bill');
    }
  };

  const handleSendPosFeedback = async () => {
    if (!posSuccessOrder) {
      setPosFeedbackMessage('Generate the bill first, then send customer feedback.');
      return;
    }

    setPosFeedbackSending(true);
    setPosFeedbackMessage(null);
    try {
      const result = await api.sendOrderWhatsAppFeedback(posSuccessOrder.id);
      setPosFeedbackMessage(result.success
        ? 'Customer feedback request sent on WhatsApp.'
        : (result.error || 'Feedback request could not be sent.'));
    } catch (err: any) {
      setPosFeedbackMessage(err.message || 'Feedback request could not be sent.');
    } finally {
      setPosFeedbackSending(false);
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F3D7D7] text-[#120B0F] mx-auto flex items-center justify-center font-serif font-bold text-2xl shadow-xl mb-3">
              G
            </div>
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F3D7D7] text-[#120B0F] font-serif font-bold text-base flex items-center justify-center shadow-md">
              G
            </div>
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
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm w-full">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer mobile or name..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C235A]/30"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  onClick={() => setCustomerModal({ isOpen: true, data: null })}
                  className="py-2 px-4 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Walk-in Customer</span>
                </button>
              </div>

              {/* Customers table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Mobile</th>
                        <th className="p-3.5">Visits</th>
                        <th className="p-3.5">Points</th>
                        <th className="p-3.5">Total Spent</th>
                        <th className="p-3.5">Tags & Allergies</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers
                        .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.mobile.includes(customerSearch))
                        .map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{c.name}</div>
                              {c.birthday && <div className="text-[10px] text-slate-400">DOB: {c.birthday}</div>}
                            </td>
                            <td className="p-3.5 text-slate-600">{c.mobile}</td>
                            <td className="p-3.5 font-semibold text-slate-800">{c.visit_count}</td>
                            <td className="p-3.5 text-[#D4AF37] font-bold">{c.loyalty_points}</td>
                            <td className="p-3.5 font-bold text-[#5B132B]">₹{c.total_spend}</td>
                            <td className="p-3.5 text-slate-500 max-w-xs truncate">
                              {c.allergies ? <span className="text-rose-600 font-bold mr-1">⚠️ {c.allergies}</span> : null}
                              {c.tags?.join(', ') || 'Regular'}
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              <a
                                href={`https://wa.me/91${c.mobile}?text=${encodeURIComponent(`Hi ${c.name}, greetings from The Glossy Looks salon, Gachibowli!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => setCustomerModal({ isOpen: true, data: c })}
                                className="inline-flex p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                                title="Edit Customer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setPosCustomerName(c.name);
                                  setPosCustomerPhone(c.mobile);
                                  setActiveTab('pos');
                                }}
                                className="inline-flex p-1.5 text-[#5B132B] hover:bg-[#FAF4F0] rounded-lg"
                                title="New POS Bill"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              {isManager && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete customer ${c.name}?`)) {
                                      await api.deleteCustomer(c.id, currentUser.name);
                                      loadAllData();
                                    }
                                  }}
                                  className="inline-flex p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
          {/* 3. APPOINTMENTS MODULE */}
          {/* ================================================================= */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Showing {appointments.length} total scheduled bookings
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Booking Ref</th>
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
                      {appointments.map(apt => (
                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#5B132B]">{apt.booking_reference}</td>
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
          )}

          {/* ================================================================= */}
          {/* 4. POS BILLING SCREEN */}
          {/* ================================================================= */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Menu Picker */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Salon Service Menu & Retail Products
                  </h3>
                  <span className="text-xs text-slate-500">Tap service to add to billing cart</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {services.map(srv => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        const existing = posSelectedItems.find(i => i.service.id === srv.id);
                        if (existing) {
                          setPosSelectedItems(prev => prev.map(i => i.service.id === srv.id ? { ...i, quantity: i.quantity + 1 } : i));
                        } else {
                          const defaultStylist = staffList.find(s => s.is_active && (s.role === 'stylist' || !s.role.includes('owner'))) || staffList.find(s => s.is_active) || staffList[0];
                          setPosSelectedItems(prev => [...prev, { service: srv, quantity: 1, staffId: defaultStylist?.id }]);
                        }
                      }}
                      className="bg-white p-3 rounded-xl border border-slate-200 text-left hover:border-[#5B132B] hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-[#8C235A] uppercase block">
                          {categories.find(c => c.id === srv.category_id)?.name}
                        </span>
                        <h4 className="font-serif font-bold text-xs text-slate-900 group-hover:text-[#5B132B] line-clamp-1 mt-0.5">
                          {srv.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">{srv.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                        <span className="font-bold text-xs text-slate-900">
                          ₹{srv.discount_price || srv.price}
                        </span>
                        <span className="w-5 h-5 rounded-full bg-[#FAF4F0] text-[#5B132B] flex items-center justify-center text-xs font-bold">
                          +
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Checkout Cart & Bill Generation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
                <form onSubmit={handlePosCheckout} className="space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-serif font-bold text-base text-slate-900">
                      Receipt Cart & POS Checkout
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cashier: <strong className="text-slate-800">{currentUser.name}</strong>
                    </p>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={posCustomerName}
                        onChange={e => setPosCustomerName(e.target.value)}
                        placeholder="e.g. Pooja Agarwal"
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={posCustomerPhone}
                        onChange={e => setPosCustomerPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  {/* Selected Items */}
                  <div className="border-t pt-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                      Selected Items ({posSelectedItems.length})
                    </label>
                    {posSelectedItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No services added to bill yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {posSelectedItems.map((item, idx) => (
                          <div key={idx} className="p-2 bg-[#FAF7F5] rounded-lg border border-slate-200 text-xs flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                                {item.service.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">₹{(item.service.discount_price || item.service.price) * item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => setPosSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-600 hover:text-rose-800"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Qty: {item.quantity}</span>
                              <select
                                value={item.staffId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPosSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, staffId: val } : x));
                                }}
                                className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                              >
                                {staffList
                                  .filter(s => s.is_active || s.id === item.staffId)
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.title || s.role})
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
                    <div className="border-t pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{posSelectedItems.reduce((sum, i) => sum + ((i.service.discount_price || i.service.price) * i.quantity), 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Discount (₹):</span>
                        <input
                          type="number"
                          min={0}
                          value={posDiscount}
                          onChange={e => setPosDiscount(Number(e.target.value))}
                          className="w-20 p-1 text-right text-xs bg-slate-50 border rounded"
                        />
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST (5%):</span>
                        <span>
                          ₹{Math.round(posSelectedItems.reduce((sum, i) => sum + ((i.service.discount_price || i.service.price) * i.quantity), 0) * 0.05)}
                        </span>
                      </div>

                      {/* Payment Mode */}
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Payment Mode *
                        </label>
                        <select
                          value={posPaymentMode}
                          onChange={(e) => setPosPaymentMode(e.target.value as any)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          <option value="UPI">UPI (Google Pay / PhonePe / QR)</option>
                          <option value="Cash">Cash Counter</option>
                          <option value="Card">Credit / Debit Card</option>
                          <option value="Bank Transfer">Bank Transfer / IMPS</option>
                          <option value="Split Payment">Split Payment</option>
                          <option value="Pay Later">Pay Later</option>
                        </select>
                      </div>

                      <div className="flex justify-between font-bold text-sm text-[#5B132B] pt-2 border-t">
                        <span>Grand Total:</span>
                        <span>
                          ₹{Math.max(0, posSelectedItems.reduce((sum, i) => sum + ((i.service.discount_price || i.service.price) * i.quantity), 0) - posDiscount + Math.round(posSelectedItems.reduce((sum, i) => sum + ((i.service.discount_price || i.service.price) * i.quantity), 0) * 0.05) + posTip)}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={posSelectedItems.length === 0}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#5B132B]/15 disabled:opacity-50"
                  >
                    <Receipt className="w-4 h-4 text-[#D4AF37]" />
                    <span>Generate Bill & Auto-Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPosFeedback}
                    disabled={!posSuccessOrder || posFeedbackSending}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#087443] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={posSuccessOrder ? 'Send the approved customer feedback template on WhatsApp' : 'Generate the bill first'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{posFeedbackSending ? 'Sending Customer Feedback…' : 'Send Customer Feedback on WhatsApp'}</span>
                  </button>
                  <p className="text-center text-[10px] text-slate-400 -mt-2">
                    {posSuccessOrder ? 'Sends the approved feedback template to this bill’s customer.' : 'Generate a bill first to enable manual feedback.'}
                  </p>
                  {posFeedbackMessage && (
                    <p className={`text-center text-[11px] font-medium ${posFeedbackMessage.includes('sent') ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {posFeedbackMessage}
                    </p>
                  )}
                </form>

                {posSuccessOrder && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Bill {posSuccessOrder.bill_number} Created!</span>
                    </div>
                    <p className="text-[11px]">Auto-queued to Salon Desktop Print Agent.</p>
                    <button
                      onClick={() => onViewReceipt(posSuccessOrder, undefined, 'bill')}
                      className="w-full py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                    >
                      Preview / Reprint Thermal Receipt
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 5. PAYMENTS & RECONCILIATION MODULE */}
          {/* ================================================================= */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-slate-900">
                    Daily Payment Transactions Ledger & Cash Reconciliation
                  </h3>
                  <span className="text-xs text-slate-500">Track settlements across UPI, Cash, Cards, and process refunds</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F5] border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Bill No</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Payment Mode</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Recorded By</th>
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#5B132B]">{p.bill_number}</td>
                          <td className="p-3.5 font-medium">{p.customer_name} ({p.customer_phone})</td>
                          <td className="p-3.5 font-bold text-slate-900">₹{p.amount.toFixed(2)}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {p.payment_mode}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700">{p.recorded_by || 'Cashier'}</td>
                          <td className="p-3.5 text-slate-400">{new Date(p.created_at).toLocaleString()}</td>
                          <td className="p-3.5 text-right">
                            {p.status === 'Success' && isManager && (
                              <button
                                onClick={async () => {
                                  const reason = prompt('Please enter reason for refund:');
                                  if (reason) {
                                    await api.refundPayment(p.id, reason, currentUser.name);
                                    loadAllData();
                                  }
                                }}
                                className="py-1 px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                Refund / Void
                              </button>
                            )}
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
              const name = form.name.value;
              const mobile = form.mobile.value;
              const email = form.email.value;
              const birthday = form.birthday.value;
              const allergies = form.allergies.value;
              const notes = form.notes.value;

              if (customerModal.data) {
                await api.updateCustomer(customerModal.data.id, { name, mobile, email, birthday, allergies, notes }, currentUser.name);
              } else {
                await api.createCustomer({ name, mobile, email, birthday, allergies, notes, loyalty_points: 0, total_spend: 0, visit_count: 1 }, currentUser.name);
              }
              setCustomerModal({ isOpen: false });
              loadAllData();
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-3 text-xs"
          >
            <h3 className="font-serif font-bold text-base text-slate-900">
              {customerModal.data ? 'Edit Customer Profile' : 'Add Walk-in Customer'}
            </h3>
            <div>
              <label className="block font-semibold mb-1">Full Name *</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={customerModal.data?.name || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Mobile Number (WhatsApp) *</label>
              <input
                name="mobile"
                type="tel"
                required
                maxLength={10}
                defaultValue={customerModal.data?.mobile || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customerModal.data?.email || ''}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Birthday</label>
                <input
                  name="birthday"
                  type="date"
                  defaultValue={customerModal.data?.birthday || ''}
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1 text-rose-700">Allergies / Skin Sensitivity</label>
              <input
                name="allergies"
                type="text"
                defaultValue={customerModal.data?.allergies || ''}
                placeholder="e.g. Sensitive to ammonia or harsh bleaches"
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preferences & Notes</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={customerModal.data?.notes || ''}
                className="w-full p-2 bg-slate-50 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-bold text-white bg-[#5B132B] rounded-xl"
              >
                Save Customer
              </button>
              <button
                type="button"
                onClick={() => setCustomerModal({ isOpen: false })}
                className="py-2 px-4 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
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
    </div>
  );
};
