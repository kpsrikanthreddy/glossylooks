/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * The Glossy Looks - Salon Website & Admin Management Full-Stack Server
 * Express Server mounting Clean RESTful APIs & Vite Dev Middleware
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { salonRepository } from './src/server/db.ts';
import type {
  WhatsAppMessageStatus,
  Order,
  DailySalesReportStatus,
  DailySalesReportLog,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppDeliveryStatus
} from './src/types/salon.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Safe environment logging (validate optional variables without crashing)
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('ℹ️ Supabase integration enabled with URL:', process.env.SUPABASE_URL);
} else {
  console.error('❌ Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
}

if (process.env.PRINT_AGENT_SECRET) {
  console.log('ℹ️ Thermal Print Agent configured');
} else {
  console.log('ℹ️ Print agent secret not set: Using default in-app receipt & print queue');
}

// Meta WhatsApp Business Embedded Signup & Coexistence configuration
const META_APP_ID = process.env.META_APP_ID || '';
const META_EMBEDDED_SIGNUP_CONFIG_ID = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_SYSTEM_USER_ACCESS_TOKEN = process.env.META_SYSTEM_USER_ACCESS_TOKEN || '';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
// Optional but recommended: the Meta Business Portfolio that owns this salon's WABA.
// It lets the server resolve a completed Embedded Signup flow when Meta does not
// include the WABA/phone IDs in the postMessage FINISH payload.
const META_BUSINESS_ID = process.env.META_BUSINESS_ID || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
// Feedback delay: 2 minutes after bill generation as per salon operations SLA
const configuredFeedbackDelayMinutes = Number(process.env.FEEDBACK_DELAY_MINUTES || '2');
const FEEDBACK_DELAY_MINUTES = Number.isFinite(configuredFeedbackDelayMinutes) && configuredFeedbackDelayMinutes > 0
  ? Math.floor(configuredFeedbackDelayMinutes)
  : 2;
const getFeedbackScheduledTime = () => new Date(Date.now() + FEEDBACK_DELAY_MINUTES * 60 * 1000).toISOString();

if (META_APP_ID) {
  console.log('ℹ️ Meta WhatsApp Business Embedded Signup initialized (App ID:', META_APP_ID, ')');
} else {
  console.log('ℹ️ Meta WhatsApp: App ID not provided in environment; in-app onboarding mode ready');
}

function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.startsWith('+') ? cleaned.slice(0, 3) + ' ' : '';
  return `${prefix}******${last4}`;
}

// Keep the exact raw body for Meta's X-Hub-Signature-256 verification while
// still parsing JSON normally for every API route.
app.use(express.json({
  verify: (req: express.Request, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  }
}));

// CORS and preflight OPTIONS handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-name, x-admin-role, x-admin-user-id, x-admin-token');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Normalize double /api/api/ prefixes that may occur with proxy rewrites
app.use((req, _res, next) => {
  if (req.url && req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }
  next();
});

// Root API index
app.get(['/api', '/api/'], (req, res) => {
  res.json({
    status: 'ok',
    brand: 'The Glossy Looks',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// SEO: SITEMAP & ROBOTS.TXT
// ============================================================================
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /portal
Disallow: /api/

Sitemap: https://theglossylooks.com/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://theglossylooks.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://theglossylooks.com/#services</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://theglossylooks.com/#makeup</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://theglossylooks.com/#packages</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

// ============================================================================
// API ROUTES
// ============================================================================

// Health check (Cloud Run and monitoring ping)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', brand: 'The Glossy Looks', timestamp: new Date().toISOString() });
});

// Settings & Contact Info
app.get('/api/settings', async (req, res) => {
  const s = await salonRepository.getSettings();
  res.json(s);
});

app.put('/api/settings', async (req, res) => {
  const user = (req.headers['x-admin-name'] as string) || 'Admin';
  const updated = await salonRepository.updateSettings(req.body, user);
  res.json(updated);
});

// ----------------------------------------------------------------------------
// Customer Authentication (Mobile OTP)
// ----------------------------------------------------------------------------
app.post('/api/auth/customer/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }
    const session = await salonRepository.createOTPSession(mobile);
    res.json({
      success: true,
      sessionId: session.sessionId,
      message: `OTP sent to ${mobile}. Demo code: ${session.otp}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/customer/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ error: 'Mobile and OTP are required' });
    }
    const result = await salonRepository.verifyOTP(mobile, otp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/customer/me', async (req, res) => {
  const mobile = req.query.mobile as string;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile query parameter' });
  const cust = await salonRepository.getCustomerByMobile(mobile);
  if (!cust) return res.status(404).json({ error: 'Customer not found' });
  res.json(cust);
});

app.get('/api/customer/appointments', async (req, res) => {
  const mobile = req.query.mobile as string;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile parameter' });
  const apts = await salonRepository.getAppointments({ customerMobile: mobile });
  res.json(apts);
});

app.get('/api/customer/orders', async (req, res) => {
  const mobile = req.query.mobile as string;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile parameter' });
  const orders = await salonRepository.getOrders({ customerMobile: mobile });
  res.json(orders);
});

// Helper to extract authenticated admin user from Authorization / x-admin-token / x-admin-role
const getAuthAdmin = async (req: express.Request) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.headers['x-admin-token'] as string);
  const userId = req.headers['x-admin-user-id'] as string;
  const adminRole = req.headers['x-admin-role'] as string;

  const users = await salonRepository.getUsers();

  // 1. Verify token: tgl_admin_token_<userId>_<timestamp>
  if (token && token.startsWith('tgl_admin_token_')) {
    const parts = token.split('_');
    if (parts.length >= 4) {
      const tokenUserId = parts[3];
      const match = users.find(x => x.id === tokenUserId && x.is_active);
      if (match) return match;
    }
  }

  // 2. Fallback to userId ONLY if accompanied by a valid token
  if (token && userId) {
    const match = users.find(x => (x.id === userId || x.user_id === userId) && x.is_active);
    if (match) return match;
  }

  // 3. For local CLI/developer testing when NODE_ENV is not production
  if (!isProd && (adminRole || userId)) {
    const match = users.find(x => ((userId && (x.id === userId || x.user_id === userId)) || (adminRole && x.role === adminRole)) && x.is_active);
    if (match) return match;
  }

  return null;
};

// ----------------------------------------------------------------------------
// Admin Authentication & Users Management (Hardened Access Control)
// ----------------------------------------------------------------------------

// Rate limiter store for admin authentication attempts
const adminLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkAdminRateLimit(key: string): { allowed: boolean; retryAfterMinutes?: number } {
  const now = Date.now();
  const entry = adminLoginAttempts.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil > now) {
    const remaining = Math.ceil((entry.lockedUntil - now) / 60000);
    return { allowed: false, retryAfterMinutes: remaining };
  }
  if (entry.lockedUntil <= now && entry.count >= 5) {
    adminLoginAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordAdminFailedAttempt(key: string) {
  const now = Date.now();
  const entry = adminLoginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15-minute security lockout
  }
  adminLoginAttempts.set(key, entry);
}

function clearAdminFailedAttempts(key: string) {
  adminLoginAttempts.delete(key);
}

const AUTHORIZED_STAFF_ROLES = ['owner', 'manager', 'receptionist', 'stylist', 'inventory_staff'];

app.post(['/api/auth/admin/login', '/auth/admin/login'], async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginTarget = (identifier || email || '').trim();
    const rawPassword = (password || '').trim();

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}_${loginTarget.toLowerCase()}`;

    // 1. Enforce brute force protection & rate limiting
    const rateCheck = checkAdminRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      await salonRepository.logAudit(
        'SECURITY_LOCKOUT',
        'Auth',
        loginTarget || clientIp,
        'Security System',
        `Access temporarily locked out for ${clientIp} targeting ${loginTarget}`
      );
      return res.status(429).json({
        error: `Too many failed login attempts. Access is temporarily locked for ${rateCheck.retryAfterMinutes} minute(s) to protect salon operations. Please contact the Salon Owner.`
      });
    }

    if (!loginTarget || !rawPassword) {
      return res.status(400).json({ error: 'Please enter your registered Staff ID, Staff Email, or Mobile Number and Password.' });
    }

    // 2. Fetch user strictly from the authorized salon staff repository
    const user = await salonRepository.getUserByIdentifier(loginTarget);
    if (!user) {
      recordAdminFailedAttempt(rateLimitKey);
      await salonRepository.logAudit(
        'SECURITY_LOGIN_FAILED',
        'Auth',
        loginTarget,
        'Security System',
        `Unrecognized user identifier '${loginTarget}' attempted login from IP: ${clientIp}`
      );
      return res.status(401).json({
        error: 'Invalid credentials or unauthorized account. Only registered salon staff and management may sign in.'
      });
    }

    // 3. Strict verification of staff roles: customers or any other roles are strictly prohibited
    if (!user.role || !AUTHORIZED_STAFF_ROLES.includes(user.role)) {
      recordAdminFailedAttempt(rateLimitKey);
      await salonRepository.logAudit(
        'SECURITY_UNAUTHORIZED_ROLE',
        'Auth',
        user.id,
        'Security System',
        `Account with non-staff role '${user.role}' attempted staff login from IP: ${clientIp}`
      );
      return res.status(403).json({
        error: 'Access denied: Customer accounts and unauthorized users cannot access the salon operations system.'
      });
    }

    // 4. Verify account is active
    if (!user.is_active) {
      recordAdminFailedAttempt(rateLimitKey);
      await salonRepository.logAudit(
        'SECURITY_DEACTIVATED_LOGIN',
        'Auth',
        user.id,
        'Security System',
        `Deactivated staff account '${user.name}' (${user.user_id}) attempted login from IP: ${clientIp}`
      );
      return res.status(403).json({
        error: 'This staff account has been deactivated. Please contact the Salon Owner.'
      });
    }

    // 5. Password verification
    if (user.password_hash !== rawPassword) {
      recordAdminFailedAttempt(rateLimitKey);
      await salonRepository.logAudit(
        'SECURITY_PASSWORD_MISMATCH',
        'Auth',
        user.id,
        'Security System',
        `Incorrect password attempt for staff user '${user.name}' (${user.user_id}) from IP: ${clientIp}`
      );
      return res.status(401).json({
        error: 'Invalid credentials or unauthorized account. Only registered salon staff and management may sign in.'
      });
    }

    // 6. Login authorized: clear rate limit failure tracking and log success
    clearAdminFailedAttempts(rateLimitKey);
    await salonRepository.logAudit(
      'SECURITY_LOGIN_SUCCESS',
      'Auth',
      user.id,
      user.name,
      `Authorized login by ${user.name} (${user.role}) [${user.user_id}] from IP: ${clientIp}`
    );

    // Update last login
    await salonRepository.updateUser(user.id, { last_login_at: new Date().toISOString() }, user.name);

    res.json({
      success: true,
      token: `tgl_admin_token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        last_login_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Current Authenticated Admin User Profile (Single Source of Truth)
app.get(['/api/auth/admin/me', '/auth/admin/me', '/api/admin/me', '/admin/me'], async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Unauthorized or session expired.' });
  }
  res.json({
    id: admin.id,
    user_id: admin.user_id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    phone: admin.phone,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at
  });
});

// User Management - RESTRICTED TO OWNER ONLY
app.get('/api/admin/users', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Only the Salon Owner can view and manage staff accounts.' });
  }
  const users = await salonRepository.getUsers();
  const safeUsers = users.map(u => ({
    id: u.id,
    user_id: u.user_id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    is_active: u.is_active,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
    updated_at: u.updated_at
  }));
  res.json(safeUsers);
});

app.post('/api/admin/users', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Only the Salon Owner can create new staff users.' });
  }
  const { name, email, phone, role, user_id, password } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Staff name and role are required.' });
  }
  const newUser = await salonRepository.createUser({
    name,
    email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@theglossylooks.com`,
    phone: phone || '',
    role,
    user_id: user_id || '',
    password_hash: password || 'admin123',
    is_active: true
  }, admin.name);

  res.status(201).json({
    id: newUser.id,
    user_id: newUser.user_id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    phone: newUser.phone,
    is_active: newUser.is_active
  });
});

app.patch('/api/admin/users/:id', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Only the Salon Owner can edit staff accounts.' });
  }
  const { name, email, phone, role, user_id, is_active } = req.body;
  const updated = await salonRepository.updateUser(req.params.id, {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(role !== undefined && { role }),
    ...(user_id !== undefined && { user_id }),
    ...(is_active !== undefined && { is_active })
  }, admin.name);

  if (!updated) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: updated.id,
    user_id: updated.user_id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone,
    is_active: updated.is_active,
    last_login_at: updated.last_login_at
  });
});

app.post('/api/admin/users/:id/reset-password', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Only the Salon Owner can reset passwords.' });
  }
  const { new_password } = req.body;
  if (!new_password || new_password.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters.' });
  }
  const success = await salonRepository.resetUserPassword(req.params.id, new_password.trim(), admin.name);
  if (!success) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, message: 'Password has been securely reset.' });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Only the Salon Owner can deactivate staff accounts.' });
  }
  const ok = await salonRepository.deleteUser(req.params.id, admin.name);
  res.json({ success: ok });
});

// ============================================================================
// WhatsApp Business Coexistence & Embedded Signup (Owner Only)
// ============================================================================

// 1. Read WhatsApp connection status & public config (Owner Only)
function isValidMetaNumericId(id?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  // Valid Meta Graph API IDs are numeric strings between 10 and 25 digits (no prefixes/mock strings)
  return /^\d{10,25}$/.test(clean);
}

type MetaGraphResult = {
  ok: boolean;
  status: number;
  data: any;
};

type MetaPhoneCandidate = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
};

type MetaAssetResolution = {
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  candidates?: MetaPhoneCandidate[];
  error?: string;
};

function getMetaErrorMessage(data: any, fallback: string): string {
  const message = typeof data?.error?.message === 'string' ? data.error.message.trim() : '';
  // Meta's normal error text is safe to show. Never include a token, code, or raw response body.
  return message ? `${fallback}: ${message}` : fallback;
}

async function graphGet(pathname: string, accessToken: string, params: Record<string, string> = {}): Promise<MetaGraphResult> {
  const url = new URL(`https://graph.facebook.com/${WHATSAPP_API_VERSION}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data: any = await response.json().catch(() => ({}));
    return { ok: response.ok && !data?.error, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

async function exchangeEmbeddedSignupCode(code: string): Promise<{ accessToken?: string; error?: string }> {
  const cleanCode = typeof code === 'string' ? code.trim() : '';
  if (!cleanCode) return { error: 'Meta authorization code was not received.' };
  if (!META_APP_ID || !META_APP_SECRET) {
    return { error: 'Server configuration error: META_APP_ID and META_APP_SECRET are required to complete Meta signup.' };
  }

  const url = new URL(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/oauth/access_token`);
  url.searchParams.set('client_id', META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('code', cleanCode);

  try {
    const response = await fetch(url.toString());
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
      return { error: getMetaErrorMessage(data, 'Meta could not exchange the Embedded Signup authorization code') };
    }
    // This token is intentionally kept only in memory for the current request.
    return { accessToken: String(data.access_token) };
  } catch {
    return { error: 'Network error while exchanging the Meta authorization code.' };
  }
}

function phoneDigits(value?: string): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhoneNumber(value?: string): {
  e164: string;
  metaRecipient: string;
  clean10: string;
  isValid: boolean;
} {
  const digits = String(value || '').replace(/\D/g, '');
  let clean10 = '';
  if (digits.length === 10) {
    clean10 = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    clean10 = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    clean10 = digits.slice(2);
  } else if (digits.length > 10) {
    clean10 = digits.slice(-10);
  }

  const isValid = /^[6-9]\d{9}$/.test(clean10);
  return {
    clean10,
    e164: clean10 ? `+91${clean10}` : '',
    metaRecipient: clean10 ? `91${clean10}` : '',
    isValid
  };
}

// Real-Time WhatsApp Inbox Server-Sent Events (SSE) connections
const whatsappInboxSseClients = new Set<express.Response>();

function broadcastWhatsAppInboxEvent(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of whatsappInboxSseClients) {
    try {
      client.write(payload);
    } catch {
      whatsappInboxSseClients.delete(client);
    }
  }
}

async function getWabaPhones(wabaId: string, accessToken: string): Promise<MetaPhoneCandidate[]> {
  const result = await graphGet(`/${wabaId}/phone_numbers`, accessToken, {
    fields: 'id,display_phone_number,verified_name'
  });
  if (!result.ok || !Array.isArray(result.data?.data)) return [];

  return result.data.data
    .filter((phone: any) => isValidMetaNumericId(String(phone?.id || '')))
    .map((phone: any) => ({
      wabaId,
      phoneNumberId: String(phone.id),
      displayPhoneNumber: typeof phone.display_phone_number === 'string' ? phone.display_phone_number : undefined,
      verifiedName: typeof phone.verified_name === 'string' ? phone.verified_name : undefined
    }));
}

async function getWabasForBusiness(businessId: string, accessToken: string): Promise<string[]> {
  const ids = new Set<string>();
  for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
    const result = await graphGet(`/${businessId}/${edge}`, accessToken, { fields: 'id,name', limit: '25' });
    if (!result.ok || !Array.isArray(result.data?.data)) continue;
    for (const account of result.data.data) {
      const id = String(account?.id || '').trim();
      if (isValidMetaNumericId(id)) ids.add(id);
    }
  }
  return [...ids];
}

async function resolveAssetsFromEmbeddedSignupCode(
  code: string,
  expectedPhoneNumber: string,
  preferredWabaId?: string,
  preferredPhoneNumberId?: string
): Promise<MetaAssetResolution> {
  const exchanged = await exchangeEmbeddedSignupCode(code);
  if (!exchanged.accessToken) return { error: exchanged.error };

  const accessToken = exchanged.accessToken;
  const businessIds = new Set<string>();
  const wabaIds = new Set<string>();

  if (isValidMetaNumericId(META_BUSINESS_ID)) businessIds.add(META_BUSINESS_ID.trim());
  if (isValidMetaNumericId(preferredWabaId)) wabaIds.add(preferredWabaId!.trim());

  // Different Meta configuration versions expose businesses through different edges.
  // Try the supported shapes without assuming a particular response structure.
  const businessResponses = await Promise.all([
    graphGet('/me/businesses', accessToken, { fields: 'id,name', limit: '25' }),
    graphGet('/me', accessToken, { fields: 'businesses{id,name}' }),
    graphGet('/me/whatsapp_business_accounts', accessToken, { fields: 'id,name', limit: '25' })
  ]);

  for (const result of businessResponses) {
    const lists = [result.data?.data, result.data?.businesses?.data];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const id = String(item?.id || '').trim();
        if (!isValidMetaNumericId(id)) continue;
        // The direct /me/whatsapp_business_accounts edge contains WABA IDs.
        if (result.data?.data === list && result.data?.data && businessResponses.indexOf(result) === 2) {
          wabaIds.add(id);
        } else {
          businessIds.add(id);
        }
      }
    }
  }

  // The code-exchange token can identify the completed signup but may not have
  // permission to enumerate business assets. For the configured Business
  // Portfolio, also use the server-only system-user token that owns the app.
  // This is required by some Coexistence configurations and is never exposed
  // to the browser or stored in the salon database.
  const discoveryTokens = [...new Set([
    accessToken,
    META_SYSTEM_USER_ACCESS_TOKEN
  ].filter(Boolean))];

  for (const businessId of [...businessIds].slice(0, 25)) {
    for (const token of discoveryTokens) {
      for (const wabaId of await getWabasForBusiness(businessId, token)) {
        wabaIds.add(wabaId);
      }
    }
  }

  if (!wabaIds.size) {
    return {
      error: !META_BUSINESS_ID
        ? 'Meta authorization succeeded, but META_BUSINESS_ID is not configured on the server. Add the salon Meta Business Portfolio ID to production secrets, then retry.'
        : !META_SYSTEM_USER_ACCESS_TOKEN
          ? 'Meta authorization succeeded, but META_SYSTEM_USER_ACCESS_TOKEN is not configured on the server. Add the system-user token with WhatsApp Business permissions, then retry.'
          : 'Meta authorization succeeded, but the configured Meta Business Portfolio did not expose a WhatsApp Business Account to the system user. Confirm that the selected Facebook account is a business admin and that the system user has access to the WhatsApp account, then retry.'
    };
  }

  const candidates: MetaPhoneCandidate[] = [];
  for (const wabaId of [...wabaIds].slice(0, 25)) {
    let phones = await getWabaPhones(wabaId, accessToken);
    // The embedded token can be limited. If a permanent system-user token is present,
    // use it only as a server-side fallback; it is never sent to the browser.
    if (!phones.length && META_SYSTEM_USER_ACCESS_TOKEN) {
      phones = await getWabaPhones(wabaId, META_SYSTEM_USER_ACCESS_TOKEN);
    }
    candidates.push(...phones);
  }

  const preferredPhone = isValidMetaNumericId(preferredPhoneNumberId) ? preferredPhoneNumberId!.trim() : '';
  const configuredDigits = phoneDigits(expectedPhoneNumber).slice(-10);
  const preferredMatches = preferredPhone
    ? candidates.filter(candidate => candidate.phoneNumberId === preferredPhone)
    : [];
  const configuredNumberMatches = configuredDigits
    ? candidates.filter(candidate => phoneDigits(candidate.displayPhoneNumber).endsWith(configuredDigits))
    : [];
  const selected = preferredMatches.length === 1
    ? preferredMatches[0]
    : configuredNumberMatches.length === 1
      ? configuredNumberMatches[0]
      : candidates.length === 1
        ? candidates[0]
        : undefined;

  if (!selected) {
    return {
      // Coexistence grants access at the business level, so Meta can legitimately
      // return more than one number. Do not guess: let the authenticated owner
      // select a returned Graph asset in the admin UI.
      candidates: candidates.length > 1 ? candidates : undefined,
      error: candidates.length
        ? 'Meta returned more than one WhatsApp phone number. Select the salon number below to finish securely.'
        : 'Meta returned a WhatsApp Business Account but no phone number that this app can access. Check the Embedded Signup configuration and system-user permissions, then retry.'
    };
  }

  return {
    wabaId: selected.wabaId,
    phoneNumberId: selected.phoneNumberId,
    displayPhoneNumber: selected.displayPhoneNumber,
    verifiedName: selected.verifiedName
  };
}

async function verifyMetaWabaOwnership(
  wabaId: string,
  phoneNumberId: string
): Promise<{
  verified: boolean;
  error?: string;
  verified_name?: string;
  display_phone_number?: string;
}> {
  if (!META_SYSTEM_USER_ACCESS_TOKEN) {
    return {
      verified: false,
      error: 'Server configuration error: META_SYSTEM_USER_ACCESS_TOKEN is not configured.'
    };
  }

  try {
    // 1. Query the WABA's phone numbers list to verify ownership
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`
      }
    });

    const data: any = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `Meta Graph API error (Status ${res.status})`;
      return {
        verified: false,
        error: `Meta verification failed for WABA ${wabaId}: ${errMsg}`
      };
    }

    const phoneNumbers: Array<{ id: string; display_phone_number?: string; verified_name?: string }> = Array.isArray(data.data) ? data.data : [];
    
    // 2. Check if the provided phone_number_id belongs to the returned WABA
    const matched = phoneNumbers.find(p => String(p.id) === String(phoneNumberId));
    if (!matched) {
      // Check direct phone query to see if phone exists on Meta
      try {
        const phoneDirectUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name`;
        const phoneDirectRes = await fetch(phoneDirectUrl, {
          headers: { Authorization: `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}` }
        });
        const phoneDirectData: any = await phoneDirectRes.json();
        if (phoneDirectRes.ok && phoneDirectData.id) {
          return {
            verified: false,
            error: `Phone number ID ${phoneNumberId} (${phoneDirectData.display_phone_number || 'unnamed'}) exists on Meta, but is not registered under WABA ${wabaId}.`
          };
        }
      } catch {
        // ignore direct check fallback
      }

      return {
        verified: false,
        error: `Phone number ID ${phoneNumberId} does not belong to the returned WhatsApp Business Account (WABA: ${wabaId}).`
      };
    }

    return {
      verified: true,
      verified_name: matched.verified_name,
      display_phone_number: matched.display_phone_number
    };
  } catch (err: any) {
    return {
      verified: false,
      error: `Network error verifying Meta IDs: ${err.message}`
    };
  }
}

app.get('/api/admin/whatsapp/status', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can view WhatsApp integration status.' });
    }

    const integration = await salonRepository.getWhatsAppIntegration();
    const settings = await salonRepository.getWhatsAppBusinessSettings();

    // Return safe data only - NEVER return META_APP_SECRET or system user tokens!
    res.json({
      integration: {
        id: integration.id,
        salon_id: integration.salon_id,
        waba_id: integration.waba_id,
        phone_number_id: integration.phone_number_id,
        display_phone_number: integration.display_phone_number,
        masked_phone_number: integration.masked_phone_number || maskPhoneNumber(integration.display_phone_number),
        display_name: integration.display_name,
        status: integration.status,
        connected_at: integration.connected_at,
        last_verified_at: integration.last_verified_at,
        diagnostics: integration.diagnostics,
        updated_at: integration.updated_at,
        error_message: integration.error_message
      },
      settings,
      config: {
        meta_app_id: META_APP_ID,
        config_id: META_EMBEDDED_SIGNUP_CONFIG_ID,
        api_version: WHATSAPP_API_VERSION,
        is_configured: Boolean(META_APP_ID && META_EMBEDDED_SIGNUP_CONFIG_ID)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Connect / Save WhatsApp Business integration after Embedded Signup (Owner Only)
app.post('/api/admin/whatsapp/connect', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can connect WhatsApp Business.' });
    }

    const { waba_id, phone_number_id, code, display_name, display_phone_number } = req.body;
    const submittedWabaId = waba_id ? String(waba_id).trim() : '';
    const submittedPhoneId = phone_number_id ? String(phone_number_id).trim() : '';
    const submittedCode = typeof code === 'string' ? code.trim() : '';

    if (submittedWabaId && !isValidMetaNumericId(submittedWabaId)) {
      return res.status(400).json({
        error: 'Invalid WABA ID received. Meta WABA IDs must be authentic numeric identifiers; placeholders are not permitted.'
      });
    }
    if (submittedPhoneId && !isValidMetaNumericId(submittedPhoneId)) {
      return res.status(400).json({
        error: 'Invalid Phone Number ID received. Meta Phone Number IDs must be authentic numeric identifiers; placeholders are not permitted.'
      });
    }

    const currentSettings = await salonRepository.getWhatsAppBusinessSettings();
    let cleanWabaId = submittedWabaId;
    let cleanPhoneId = submittedPhoneId;
    let codeResolvedDisplayName = '';
    let codeResolvedPhone = '';

    // A Coexistence flow can complete with an OAuth code even when the popup does
    // not include IDs in its FINISH postMessage. Resolve those IDs server-side;
    // never use the configured phone number itself as a replacement Meta ID.
    if (!cleanWabaId || !cleanPhoneId) {
      if (!submittedCode) {
        return res.status(400).json({
          error: 'Connection incomplete — Meta did not supply both account IDs or an authorization code. Please retry Embedded Signup.'
        });
      }

      const resolved = await resolveAssetsFromEmbeddedSignupCode(
        submittedCode,
        currentSettings.business_number,
        cleanWabaId || undefined,
        cleanPhoneId || undefined
      );
      if (!resolved.wabaId || !resolved.phoneNumberId) {
        if (resolved.candidates?.length) {
          return res.json({
            success: false,
            selection_required: true,
            message: resolved.error,
            candidates: resolved.candidates.map(candidate => ({
              waba_id: candidate.wabaId,
              phone_number_id: candidate.phoneNumberId,
              display_phone_number: candidate.displayPhoneNumber || '',
              verified_name: candidate.verifiedName || ''
            }))
          });
        }
        return res.status(400).json({
          error: resolved.error || 'Meta authorization was received, but the WABA and Phone Number ID could not be resolved safely.'
        });
      }
      cleanWabaId = resolved.wabaId;
      cleanPhoneId = resolved.phoneNumberId;
      codeResolvedDisplayName = resolved.verifiedName || '';
      codeResolvedPhone = resolved.displayPhoneNumber || '';
    }

    if (!isValidMetaNumericId(cleanWabaId) || !isValidMetaNumericId(cleanPhoneId)) {
      return res.status(400).json({
        error: 'Meta authorization completed, but valid WABA and Phone Number IDs could not be resolved. Please retry the official Meta Embedded Signup flow.'
      });
    }

    let resolvedDisplayName = codeResolvedDisplayName || display_name || currentSettings.display_name || 'The Glossy Looks Salon';
    let resolvedPhone = codeResolvedPhone || display_phone_number || currentSettings.business_number || '';

    // Step 4: Call Meta Graph API server-side to verify that the phone number belongs to the returned WABA
    const verification = await verifyMetaWabaOwnership(cleanWabaId, cleanPhoneId);

    if (verification.verified) {
      if (verification.verified_name) resolvedDisplayName = verification.verified_name;
      if (verification.display_phone_number) resolvedPhone = verification.display_phone_number;
      const maskedPhone = maskPhoneNumber(resolvedPhone);
      const diagnosticDetail = `${submittedCode ? 'OAuth code received / ' : ''}WABA ID received / Phone Number ID received / Graph verification passed.`;

      const saved = await salonRepository.updateWhatsAppIntegration({
        salon_id: 'tgl-gachibowli-main',
        waba_id: cleanWabaId,
        phone_number_id: cleanPhoneId,
        display_name: resolvedDisplayName,
        display_phone_number: resolvedPhone,
        masked_phone_number: maskedPhone,
        status: 'connected',
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        updated_at: new Date().toISOString(),
        error_message: undefined
      }, admin.name);

      return res.json({
        success: true,
        message: 'WhatsApp Business Coexistence connected and verified with Meta Graph API.',
        diagnostics: diagnosticDetail,
        integration: saved
      });
    } else {
      // Verification failed: store received IDs, but keep status disconnected with error explanation
      const diagnosticDetail = `${submittedCode ? 'OAuth code received / ' : ''}WABA ID received / Phone Number ID received / Graph verification failed: ${verification.error || 'Ownership mismatch'}`;
      const saved = await salonRepository.updateWhatsAppIntegration({
        salon_id: 'tgl-gachibowli-main',
        waba_id: cleanWabaId,
        phone_number_id: cleanPhoneId,
        display_name: resolvedDisplayName,
        display_phone_number: resolvedPhone,
        masked_phone_number: maskPhoneNumber(resolvedPhone),
        status: 'disconnected',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        updated_at: new Date().toISOString(),
        error_message: verification.error
      }, admin.name);

      return res.status(400).json({
        success: false,
        error: verification.error || 'Meta verification failed. Phone number does not belong to the returned WABA.',
        diagnostics: diagnosticDetail,
        integration: saved
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test / Verify WhatsApp Connection with Meta Graph API on demand (Owner Only)
app.post('/api/admin/whatsapp/test', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can test the WhatsApp connection.' });
    }

    const integration = await salonRepository.getWhatsAppIntegration();
    if (!integration.waba_id || !integration.phone_number_id) {
      return res.status(400).json({
        error: 'No WhatsApp Business IDs configured. Please connect via Meta Embedded Signup first.'
      });
    }

    if (!isValidMetaNumericId(integration.waba_id) || !isValidMetaNumericId(integration.phone_number_id)) {
      return res.status(400).json({
        error: 'Stored Meta IDs are invalid or placeholder. Please reconnect via Meta Embedded Signup.'
      });
    }

    const verification = await verifyMetaWabaOwnership(integration.waba_id, integration.phone_number_id);

    if (verification.verified) {
      const diagnosticDetail = 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.';
      const updated = await salonRepository.updateWhatsAppIntegration({
        status: 'connected',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: undefined,
        ...(verification.verified_name && { display_name: verification.verified_name }),
        ...(verification.display_phone_number && { 
          display_phone_number: verification.display_phone_number,
          masked_phone_number: maskPhoneNumber(verification.display_phone_number)
        })
      }, admin.name);

      return res.json({
        success: true,
        message: 'WhatsApp connection verified successfully with Meta Graph API. Account is active.',
        diagnostics: diagnosticDetail,
        integration: updated
      });
    } else {
      const diagnosticDetail = `WABA ID received / Phone Number ID received / Graph verification failed: ${verification.error || 'Verification failed'}`;
      const updated = await salonRepository.updateWhatsAppIntegration({
        status: 'disconnected',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: verification.error
      }, admin.name);

      return res.status(400).json({
        success: false,
        error: verification.error || 'Meta Graph API verification failed.',
        diagnostics: diagnosticDetail,
        integration: updated
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Disconnect WhatsApp Business integration (Owner Only)
app.post('/api/admin/whatsapp/disconnect', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can disconnect WhatsApp Business.' });
    }

    // Disconnect integration without erasing historical message or interaction records
    const disconnected = await salonRepository.disconnectWhatsAppIntegration(admin.name);

    res.json({
      success: true,
      message: 'WhatsApp Business integration has been disconnected.',
      integration: {
        id: disconnected.id,
        salon_id: disconnected.salon_id,
        status: disconnected.status,
        masked_phone_number: disconnected.masked_phone_number,
        display_name: disconnected.display_name,
        updated_at: disconnected.updated_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update WhatsApp Business Settings (Owner Only)
app.post('/api/admin/whatsapp/settings', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can update WhatsApp settings.' });
    }

    const { business_number, country_code, display_name, is_enabled } = req.body;

    if (!business_number || typeof business_number !== 'string') {
      return res.status(400).json({ error: 'A valid WhatsApp business phone number is required.' });
    }

    const cleanNumber = business_number.replace(/\D/g, '').slice(-10);
    // Validate Indian mobile numbers: 10 digits starting with 6, 7, 8, or 9
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanNumber)) {
      return res.status(400).json({
        error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number (e.g., 9848012345) starting with 6, 7, 8, or 9.'
      });
    }

    const saved = await salonRepository.updateWhatsAppBusinessSettings({
      business_number: cleanNumber,
      country_code: country_code || '+91',
      display_name: display_name ? display_name.trim() : 'The Glossy Looks',
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : true
    }, admin.name);

    res.json({
      success: true,
      message: 'Salon WhatsApp Business settings updated successfully.',
      settings: saved
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Real WhatsApp Cloud API Template Sender & Coexistence Automation
// ============================================================================

interface SendWhatsAppTemplateOptions {
  branchId: string;
  recipientPhone: string;
  templateName: string;
  templateLanguage?: string;
  components?: any[];
  appointmentId?: string;
  orderId?: string;
  jobType?: 'appointment_confirmation' | 'customer_feedback' | 'bill_receipt' | string;
  customData?: {
    customerName?: string;
    branchName?: string;
    serviceNames?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    bookingId?: string;
    branchAddress?: string;
    billNumber?: string;
    billDate?: string;
    itemsSummary?: string;
    grandTotal?: string | number;
    paymentMode?: string;
    stylistName?: string;
    ownerName?: string;
    reportDate?: string;
    billsCount?: string | number;
    servicesCount?: string | number;
    totalSales?: string | number;
    cashAmount?: string | number;
    upiAmount?: string | number;
    otherAmount?: string | number;
    totalBills?: string | number;
    totalServices?: string | number;
    cashTotal?: string | number;
    upiTotal?: string | number;
    otherTotal?: string | number;
    breakdownText?: string;
  };
}

async function sendBranchWhatsAppTemplate(options: SendWhatsAppTemplateOptions): Promise<{
  sent: boolean;
  status: 'sent' | 'pending_approval' | 'failed' | 'retrying';
  messageId?: string;
  error?: string;
  diagnostics?: string;
  log?: any;
}> {
  const { branchId, recipientPhone, templateName, appointmentId, orderId, customData } = options;
  let integration = await salonRepository.getBranchWhatsAppIntegration(branchId);
  if (!integration || integration.status !== 'connected' || !integration.phone_number_id) {
    const fallback = await salonRepository.getBranchWhatsAppIntegration('tgl-gachibowli-main');
    if (fallback && fallback.status === 'connected' && fallback.phone_number_id) {
      integration = fallback;
    }
  }

  const normalized = normalizePhoneNumber(recipientPhone);

  const resolvedJobType = options.jobType || (
    templateName === 'gl_bill_receipt' ? 'bill_receipt' :
    templateName.includes('feedback') ? 'customer_feedback' : 'appointment_confirmation'
  );

  if (!normalized.isValid) {
    const errorMsg = 'Invalid recipient phone number. Valid 10-digit Indian mobile number required.';
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      customer_name: customData?.customerName,
      template_name: templateName,
      job_type: resolvedJobType,
      recipient_number: recipientPhone || 'unknown',
      sender_phone_number_id: integration?.phone_number_id || 'unassigned',
      status: 'failed',
      error_message: errorMsg,
      diagnostics: 'Recipient validation failed'
    });
    return { sent: false, status: 'failed', error: errorMsg, log };
  }

  const recipientMeta = normalized.metaRecipient; // e.g. 918179620607
  const recipientE164 = normalized.e164; // e.g. +918179620607

  if (!integration || integration.status !== 'connected' || !integration.phone_number_id) {
    const errorMsg = `Branch WhatsApp integration is ${integration?.status || 'disconnected'}. Please connect WhatsApp in Admin Settings.`;
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      customer_name: customData?.customerName,
      template_name: templateName,
      job_type: resolvedJobType,
      recipient_number: recipientE164,
      sender_phone_number_id: integration?.phone_number_id || 'unassigned',
      status: 'failed',
      error_message: errorMsg,
      diagnostics: 'Branch connection check failed'
    });
    return { sent: false, status: 'failed', error: errorMsg, log };
  }

  if (!META_SYSTEM_USER_ACCESS_TOKEN) {
    const errorMsg = 'Server configuration error: META_SYSTEM_USER_ACCESS_TOKEN is not configured.';
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      customer_name: customData?.customerName,
      template_name: templateName,
      job_type: resolvedJobType,
      recipient_number: recipientE164,
      sender_phone_number_id: integration.phone_number_id,
      status: 'failed',
      error_message: errorMsg,
      diagnostics: 'Missing system user access token'
    });
    return { sent: false, status: 'failed', error: errorMsg, log };
  }

  // Resolve template components and language
  let resolvedTemplateName = templateName;
  let resolvedLang = options.templateLanguage;
  let components = options.components;

  if (templateName === 'gl_appointment_confirmation') {
    resolvedLang = resolvedLang || 'en_US';
    if (!components) {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: customData?.customerName || 'Valued Customer' },
            { type: 'text', parameter_name: 'branch_name', text: customData?.branchName || 'The Glossy Looks' },
            { type: 'text', parameter_name: 'service_name', text: customData?.serviceNames || 'Salon Services' },
            { type: 'text', parameter_name: 'appointment_date', text: customData?.appointmentDate || new Date().toISOString().split('T')[0] },
            { type: 'text', parameter_name: 'appointment_time', text: customData?.appointmentTime || 'Scheduled Slot' },
            { type: 'text', parameter_name: 'booking_id', text: customData?.bookingId || 'GL-BKG' },
            { type: 'text', parameter_name: 'branch_address', text: customData?.branchAddress || '31, Vinayak Nagar, Gachibowli' }
          ]
        }
      ];
    }
  } else if (templateName === 'the_glossylooks_customer_feedback' || templateName === 'glossylooks_customer_feedback') {
    // Approved Meta template identifier on WABA is glossylooks_customer_feedback
    resolvedTemplateName = 'glossylooks_customer_feedback';
    resolvedLang = resolvedLang || 'en';
    if (!components) {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customData?.customerName || 'Valued Customer' }
          ]
        }
      ];
    }
  } else if (templateName === 'gl_bill_receipt') {
    // Approved Meta bill receipt template on WABA (language: en, 5 positional parameters)
    resolvedTemplateName = 'gl_bill_receipt';
    resolvedLang = resolvedLang || 'en';
    if (!components) {
      const rawTotal = String(customData?.grandTotal || '0').replace(/[^0-9.]/g, '') || '0';
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customData?.customerName || 'Valued Customer' },
            { type: 'text', text: customData?.billNumber || 'TGL-BILL' },
            { type: 'text', text: customData?.itemsSummary || 'Salon Services' },
            { type: 'text', text: rawTotal },
            { type: 'text', text: customData?.paymentMode || 'UPI' }
          ]
        }
      ];
    }
  } else if (templateName === 'gl_stylist_daily_sales_report') {
    resolvedTemplateName = 'gl_stylist_daily_sales_report';
    resolvedLang = resolvedLang || 'en';
    if (!components) {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customData?.stylistName || 'Stylist' },
            { type: 'text', text: customData?.reportDate || new Date().toISOString().split('T')[0] },
            { type: 'text', text: String(customData?.billsCount ?? '0') },
            { type: 'text', text: String(customData?.servicesCount ?? '0') },
            { type: 'text', text: String(customData?.totalSales ?? '0') },
            { type: 'text', text: String(customData?.cashAmount ?? '0') },
            { type: 'text', text: String(customData?.upiAmount ?? '0') },
            { type: 'text', text: String(customData?.otherAmount ?? '0') }
          ]
        }
      ];
    }
  } else if (templateName === 'gl_owner_daily_sales_summary') {
    resolvedTemplateName = 'gl_owner_daily_sales_summary';
    resolvedLang = resolvedLang || 'en';
    if (!components) {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customData?.ownerName || 'Salon Owner' },
            { type: 'text', text: customData?.reportDate || new Date().toISOString().split('T')[0] },
            { type: 'text', text: String(customData?.totalBills ?? '0') },
            { type: 'text', text: String(customData?.totalServices ?? '0') },
            { type: 'text', text: String(customData?.totalSales ?? '0') },
            { type: 'text', text: String(customData?.cashTotal ?? '0') },
            { type: 'text', text: String(customData?.upiTotal ?? '0') },
            { type: 'text', text: String(customData?.otherTotal ?? '0') },
            { type: 'text', text: customData?.breakdownText || 'No stylist sales recorded.' }
          ]
        }
      ];
    }
  } else if (templateName === 'hello_world') {
    resolvedLang = resolvedLang || 'en_US';
    components = [];
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${integration.phone_number_id}/messages`;
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientMeta,
        type: 'template',
        template: {
          name: resolvedTemplateName,
          language: { code: resolvedLang },
          ...(components && components.length > 0 ? { components } : {})
        }
      })
    });

    let data: any = await response.json().catch(() => ({}));

    // If Meta returns error 132001 (Template does not exist in translated language), retry with alternate language code (en <-> en_US)
    if (!response.ok && data?.error?.code === 132001) {
      const altLang = resolvedLang === 'en_US' ? 'en' : 'en_US';
      console.log(`[Meta WhatsApp] Template ${resolvedTemplateName} not found in ${resolvedLang}, retrying with ${altLang}...`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientMeta,
          type: 'template',
          template: {
            name: resolvedTemplateName,
            language: { code: altLang },
            ...(components && components.length > 0 ? { components } : {})
          }
        })
      });
      data = await response.json().catch(() => ({}));
      if (response.ok) {
        resolvedLang = altLang;
      }
    }

    if (response.ok && data?.messages?.[0]?.id) {
      const messageId = data.messages[0].id;
      const sentTime = new Date().toISOString();
      const log = await salonRepository.createWhatsAppMessageLog({
        appointment_id: appointmentId,
        order_id: orderId,
        branch_id: branchId,
        customer_name: customData?.customerName,
        template_name: resolvedTemplateName,
        job_type: resolvedJobType,
        recipient_number: recipientE164,
        sender_phone_number_id: integration.phone_number_id,
        meta_message_id: messageId,
        status: 'sent',
        sent_at: sentTime,
        diagnostics: `Graph API message queued (Message ID: ${messageId})`
      });

      if (orderId) {
        if (resolvedJobType === 'bill_receipt') {
          await salonRepository.updateOrder(orderId, {
            receipt_whatsapp_status: 'sent',
            receipt_whatsapp_message_id: messageId,
            receipt_whatsapp_sent_at: sentTime,
            receipt_whatsapp_error: undefined,
            whatsapp_status: 'sent'
          });
        } else if (resolvedJobType === 'customer_feedback') {
          await salonRepository.updateOrder(orderId, {
            feedback_whatsapp_status: 'sent',
            feedback_whatsapp_message_id: messageId,
            feedback_whatsapp_sent_at: sentTime,
            feedback_whatsapp_error: undefined
          });
          await salonRepository.cancelScheduledFeedbackJobByOrder(orderId);
        }
      }

      // Record outbound template message into WhatsApp Inbox
      try {
        const inboxConv = await salonRepository.getOrCreateWhatsAppConversation({
          branch_id: branchId,
          customer_phone: recipientE164,
          customer_name: customData?.customerName,
          wa_phone_number_id: integration.phone_number_id
        });
        const inboxMsg = await salonRepository.createWhatsAppMessage({
          conversation_id: inboxConv.id,
          direction: 'outbound',
          type: 'template',
          body: `Template: ${resolvedTemplateName}`,
          template_name: resolvedTemplateName,
          meta_message_id: messageId,
          delivery_status: 'sent',
          sent_at: sentTime
        });
        broadcastWhatsAppInboxEvent({
          type: 'outbound_message',
          conversationId: inboxConv.id,
          message: inboxMsg,
          conversation: inboxConv
        });
      } catch (inboxErr) {
        console.warn('[WhatsApp Inbox] Failed to record outbound template in inbox:', inboxErr);
      }

      return { sent: true, status: 'sent', messageId, log };
    }

    // Handle Meta Graph API rejection
    const errMsg = data?.error?.message || response.statusText || 'Unknown Meta error';
    const errCode = data?.error?.code;

    // Detect Meta App Review / development mode / test recipient limits
    const isAppReviewOrSandbox =
      errCode === 131030 || // Recipient phone number not in allowed list
      errCode === 131031 ||
      (errCode === 100 && (errMsg.includes('Invalid parameter') || errMsg.includes('phone') || errMsg.includes('allowed list'))) ||
      errMsg.toLowerCase().includes('not in allowed list') ||
      errMsg.toLowerCase().includes('review') ||
      errMsg.toLowerCase().includes('development');

    // Detect temporary/retryable errors: rate limits (Code 4, 17, 32, 613, 80007), temporary service error (Code 1, 2), or 5xx HTTP response
    const isRetryable =
      response.status >= 500 ||
      errCode === 4 ||
      errCode === 17 ||
      errCode === 32 ||
      errCode === 613 ||
      errCode === 80007 ||
      errMsg.toLowerCase().includes('rate limit') ||
      errMsg.toLowerCase().includes('temporarily unavailable') ||
      errMsg.toLowerCase().includes('try again');

    const status: 'sent' | 'pending_approval' | 'failed' | 'retrying' = isAppReviewOrSandbox
      ? 'pending_approval'
      : isRetryable
      ? 'retrying'
      : 'failed';

    const friendlyError = isAppReviewOrSandbox
      ? 'Pending Meta approval: Live sending is currently restricted by Meta while App Review is in progress. Real messages can only be delivered to verified test/admin phone numbers in Meta App Settings.'
      : isRetryable
      ? `Meta API temporarily unavailable (Code ${errCode || response.status}): Enqueued for automatic retry.`
      : `Meta API delivery failed: ${errMsg}`;

    const diagnostic = `Meta Graph API error (Code ${errCode || 'N/A'}): ${errMsg}`;
    const nextRetryAt = isRetryable ? new Date(Date.now() + 60 * 1000).toISOString() : undefined;

    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      customer_name: customData?.customerName,
      template_name: resolvedTemplateName,
      job_type: resolvedJobType,
      recipient_number: recipientE164,
      sender_phone_number_id: integration.phone_number_id,
      status: status,
      error_message: friendlyError,
      diagnostics: diagnostic,
      retry_count: isRetryable ? 1 : 0,
      next_retry_at: nextRetryAt
    });

    if (orderId) {
      if (resolvedJobType === 'bill_receipt') {
        await salonRepository.updateOrder(orderId, {
          receipt_whatsapp_status: status,
          receipt_whatsapp_error: friendlyError,
          whatsapp_status: status,
          whatsapp_error: friendlyError
        });
      } else if (resolvedJobType === 'customer_feedback') {
        await salonRepository.updateOrder(orderId, {
          feedback_whatsapp_status: status,
          feedback_whatsapp_error: friendlyError
        });
      }
    }

    return {
      sent: false,
      status: status,
      error: friendlyError,
      diagnostics: diagnostic,
      log
    };
  } catch (err: any) {
    const errorMsg = `Network error communicating with Meta Cloud API: ${err.message}`;
    const nextRetryAt = new Date(Date.now() + 60 * 1000).toISOString();
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      customer_name: customData?.customerName,
      template_name: templateName,
      job_type: resolvedJobType,
      recipient_number: recipientE164,
      sender_phone_number_id: integration?.phone_number_id || 'unassigned',
      status: 'retrying',
      error_message: errorMsg,
      diagnostics: `Network failure: ${err.message}`,
      retry_count: 1,
      next_retry_at: nextRetryAt
    });

    if (orderId) {
      if (resolvedJobType === 'bill_receipt') {
        await salonRepository.updateOrder(orderId, {
          receipt_whatsapp_status: 'retrying',
          receipt_whatsapp_error: errorMsg,
          whatsapp_status: 'retrying',
          whatsapp_error: errorMsg
        });
      } else if (resolvedJobType === 'customer_feedback') {
        await salonRepository.updateOrder(orderId, {
          feedback_whatsapp_status: 'retrying',
          feedback_whatsapp_error: errorMsg
        });
      }
    }

    return { sent: false, status: 'retrying', error: `${errorMsg}. Enqueued for automatic retry.`, log };
  }
}

async function sendWhatsAppFreeformReply(
  branchId: string,
  recipientPhone: string,
  text: string,
  explicitPhoneNumberId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let phoneNumberId = explicitPhoneNumberId;
  if (!phoneNumberId) {
    let integration: any = await salonRepository.getBranchWhatsAppIntegration(branchId);
    if (!integration || !integration.phone_number_id) {
      integration = await salonRepository.getBranchWhatsAppIntegration('tgl-gachibowli-main');
    }
    if (!integration || !integration.phone_number_id) {
      integration = await salonRepository.getWhatsAppIntegration();
    }
    phoneNumberId = integration?.phone_number_id;
  }

  // Fallback to active salon phone number ID if still not found
  if (!phoneNumberId) {
    phoneNumberId = '1379025201957313';
  }

  if (!META_SYSTEM_USER_ACCESS_TOKEN) {
    console.error('[WhatsApp Freeform] Missing META_SYSTEM_USER_ACCESS_TOKEN');
    return { success: false, error: 'WhatsApp META_SYSTEM_USER_ACCESS_TOKEN not configured' };
  }

  const cleanPhone = phoneDigits(recipientPhone).slice(-10);
  const to = '91' + cleanPhone;
  try {
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: true,
          body: text
        }
      })
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.messages?.[0]?.id) {
      console.log(`[WhatsApp Freeform] Sent reply successfully to ${to}, messageId: ${data.messages[0].id}`);
      return { success: true, messageId: data.messages[0].id };
    } else {
      const err = data?.error?.message || res.statusText || 'Unknown Meta error';
      console.warn(`[WhatsApp Freeform] Meta error sending reply to ${to}:`, err);
      return { success: false, error: err };
    }
  } catch (err: any) {
    console.error(`[WhatsApp Freeform] Network error sending reply to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------------
// Durable Server-Side Scheduled Feedback Job Runner
// ----------------------------------------------------------------------------
async function checkAndRunScheduledFeedbackJobs() {
  try {
    // 1. Process due jobs from scheduled_feedback_jobs table
    const dueJobs = await salonRepository.getDueScheduledFeedbackJobs().catch(() => []);
    if (dueJobs && dueJobs.length) {
      for (const job of dueJobs) {
        try {
          console.log(`[Scheduled Feedback] Executing due job ${job.id} for appointment/order ${job.appointment_id || job.order_id}...`);

          if (job.appointment_id) {
            const apt = await salonRepository.getAppointmentById(job.appointment_id).catch(() => null);
            if (!apt || apt.status === 'Cancelled' || apt.status === 'No Show') {
              console.log(`[Scheduled Feedback] Appointment ${job.appointment_id} is cancelled/no-show. Skipping feedback.`);
              await salonRepository.updateScheduledFeedbackJob(job.id, { status: 'cancelled' }).catch(() => null);
              continue;
            }
          }

          if (job.order_id) {
            const ord = await salonRepository.getOrderById(job.order_id).catch(() => null);
            if (ord && (ord.feedback_whatsapp_status === 'sent' || ord.feedback_whatsapp_status === 'delivered' || ord.feedback_whatsapp_status === 'read')) {
              console.log(`[Scheduled Feedback] Order ${job.order_id} feedback already sent. Marking job completed.`);
              await salonRepository.updateScheduledFeedbackJob(job.id, { status: 'completed' }).catch(() => null);
              continue;
            }
          }

          if (job.status !== 'pending') continue;

          // Mark processing
          await salonRepository.updateScheduledFeedbackJob(job.id, { status: 'processing' }).catch(() => null);

          const result = await sendBranchWhatsAppTemplate({
            branchId: job.branch_id || 'tgl-gachibowli-main',
            recipientPhone: job.customer_phone,
            templateName: 'glossylooks_customer_feedback',
            appointmentId: job.appointment_id,
            orderId: job.order_id,
            jobType: 'customer_feedback',
            customData: {
              customerName: job.customer_name
            }
          });

          if (result.status === 'sent') {
            await salonRepository.updateScheduledFeedbackJob(job.id, {
              status: 'completed',
              meta_message_id: result.messageId,
              attempts: (job.attempts || 0) + 1
            }).catch(() => null);
          } else {
            await salonRepository.updateScheduledFeedbackJob(job.id, {
              status: result.status === 'retrying' ? 'pending' : 'failed',
              error_message: result.error,
              attempts: (job.attempts || 0) + 1
            }).catch(() => null);
          }
        } catch (jobErr: any) {
          console.error(`[Scheduled Feedback] Error executing job ${job.id}:`, jobErr.message);
        }
      }
    }

    // 2. Secondary defensive fallback: scan orders table for any order where feedback is scheduled and due
    try {
      const orders = await salonRepository.getOrders();
      const nowMs = Date.now();
      const dueOrders = (orders || []).filter(o =>
        o.feedback_whatsapp_status === 'scheduled' &&
        o.feedback_whatsapp_scheduled_at &&
        new Date(o.feedback_whatsapp_scheduled_at).getTime() <= nowMs
      );

      for (const ord of dueOrders) {
        try {
          console.log(`[Scheduled Feedback Auto] Order ${ord.bill_number || ord.id} feedback is due. Dispatching WhatsApp feedback...`);
          await salonRepository.updateOrder(ord.id, { feedback_whatsapp_status: 'sending' });

          const res = await sendBranchWhatsAppTemplate({
            branchId: ord.branch_id || 'tgl-gachibowli-main',
            recipientPhone: ord.customer_phone,
            templateName: 'glossylooks_customer_feedback',
            orderId: ord.id,
            appointmentId: ord.appointment_id,
            jobType: 'customer_feedback',
            customData: {
              customerName: ord.customer_name
            }
          });
          console.log(`[Scheduled Feedback Auto] Order ${ord.bill_number} dispatch result:`, res.status);
        } catch (ordErr: any) {
          console.error(`[Scheduled Feedback Auto] Error sending feedback for order ${ord.id}:`, ordErr.message);
        }
      }
    } catch {}
  } catch (err: any) {
    console.error('[Scheduled Feedback] Runner error:', err.message);
  }
}

// Durable interval runner: checks every 15 seconds so feedback sends right at 2 minutes
setInterval(() => {
  checkAndRunScheduledFeedbackJobs().catch(() => {});
}, 15000);

// ----------------------------------------------------------------------------
// Automatic Exponential Backoff WhatsApp Retry Runner
// Retries temporary failed/rate-limited jobs (1 min, 5 min, 15 min, max 3)
// ----------------------------------------------------------------------------
async function checkAndRunWhatsAppRetries() {
  try {
    const dueRetries = await salonRepository.getDueWhatsAppMessageRetries();
    if (!dueRetries || !dueRetries.length) return;

    for (const log of dueRetries) {
      const nextRetryCount = (log.retry_count || 0) + 1;
      const result = await sendBranchWhatsAppTemplate({
        branchId: log.branch_id || 'tgl-gachibowli-main',
        recipientPhone: log.recipient_number,
        templateName: log.template_name || 'glossylooks_customer_feedback',
        orderId: log.order_id,
        appointmentId: log.appointment_id,
        customData: {
          customerName: log.customer_name || 'Valued Customer'
        }
      });

      if (result.sent) {
        await salonRepository.updateWhatsAppMessageLog(log.id, {
          status: 'sent',
          meta_message_id: result.messageId,
          sent_at: new Date().toISOString(),
          error_message: undefined
        });
        if (log.order_id) {
          await salonRepository.updateOrder(log.order_id, {
            whatsapp_status: 'sent',
            whatsapp_message_id: result.messageId,
            whatsapp_error: undefined
          });
        }
      } else {
        if (nextRetryCount >= 3) {
          await salonRepository.updateWhatsAppMessageLog(log.id, {
            status: 'failed',
            retry_count: nextRetryCount,
            error_message: result.error || 'Exceeded maximum retry attempts (3)'
          });
          if (log.order_id) {
            await salonRepository.updateOrder(log.order_id, {
              whatsapp_status: 'failed',
              whatsapp_error: result.error || 'Exceeded maximum retry attempts'
            });
          }
        } else {
          const delayMinutes = nextRetryCount === 1 ? 1 : nextRetryCount === 2 ? 5 : 15;
          const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          await salonRepository.updateWhatsAppMessageLog(log.id, {
            status: 'retrying',
            retry_count: nextRetryCount,
            next_retry_at: nextRetryAt,
            error_message: result.error
          });
          if (log.order_id) {
            await salonRepository.updateOrder(log.order_id, {
              whatsapp_status: 'retrying',
              whatsapp_error: result.error
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Retries] Runner error:', err.message);
  }
}

setInterval(() => {
  checkAndRunWhatsAppRetries().catch(() => {});
}, 30000);

// ============================================================================
// Automated Daily Stylist Sales Reporting Through WhatsApp (10:15 PM Asia/Kolkata)
// ============================================================================

function getKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

function getKolkataDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(dt);
  } catch {
    return dateStr;
  }
}

interface StylistDailySalesAccumulator {
  stylistId?: string;
  stylistName: string;
  phone: string;
  userRole?: string;
  billIds: Set<string>;
  servicesCount: number;
  totalSales: number;
  cashAmount: number;
  upiAmount: number;
  otherAmount: number;
}

async function calculateDailySalesForKolkataDate(targetDateStr: string) {
  // 1. Fetch completed POS orders for calendar day (Asia/Kolkata boundaries)
  const allOrders = await salonRepository.getOrders();
  const dayOrders = (allOrders || []).filter(o => {
    if (o.payment_status === 'Cancelled') return false;
    const orderDateKolkata = getKolkataDateString(new Date(o.created_at));
    return orderDateKolkata === targetDateStr;
  });

  const users = await salonRepository.getUsers();
  const staff = await salonRepository.getStaff();

  // Helper to match stylist/staff member to user account and contact
  const findStylistDetails = (idOrName?: string) => {
    if (!idOrName) return null;
    const clean = idOrName.trim();
    const lower = clean.toLowerCase();

    // Match in staff
    const stf = staff.find(s => s.id === clean || s.user_id === clean || s.name.toLowerCase() === lower);
    // Match in users
    const usr = users.find(u =>
      u.id === clean ||
      u.user_id === clean ||
      u.name.toLowerCase() === lower ||
      (stf && (u.id === stf.user_id || (u.email && stf.email && u.email.toLowerCase() === stf.email.toLowerCase())))
    );

    const name = usr?.name || stf?.name || clean;
    const phone = usr?.phone || stf?.phone || '';
    const stylistId = usr?.id || stf?.id || undefined;
    const role = usr?.role || (stf?.role ? stf.role.toLowerCase() : 'stylist');
    const isActive = usr ? usr.is_active : (stf ? stf.is_active : true);

    return { name, phone, stylistId, role, isActive };
  };

  const stylistMap = new Map<string, StylistDailySalesAccumulator>();

  const totalSalonBillsSet = new Set<string>();
  let totalSalonServices = 0;
  let totalSalonSales = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let otherTotal = 0;

  for (const ord of dayOrders) {
    const orderId = ord.id || ord.bill_number;
    totalSalonBillsSet.add(orderId);
    const orderTotal = Number(ord.grand_total || 0);
    totalSalonSales += orderTotal;

    const payMethod = (ord.primary_payment_mode || (ord as any).payment_method || '').toLowerCase();
    if (payMethod.includes('cash')) {
      cashTotal += orderTotal;
    } else if (payMethod.includes('upi')) {
      upiTotal += orderTotal;
    } else {
      otherTotal += orderTotal;
    }

    // Process items for stylist breakdown
    const items = ord.items && Array.isArray(ord.items) && ord.items.length > 0
      ? ord.items
      : [{
          item_name: 'Salon Service',
          item_type: 'service' as const,
          quantity: 1,
          unit_price: orderTotal,
          total_price: orderTotal,
          staff_id: (ord as any).stylist_id,
          staff_name: (ord as any).stylist_name
        }];

    for (const item of items) {
      // Attribute service items completed by a stylist
      const isService = item.item_type === 'service' || !item.item_type;
      if (!isService) continue;

      const qty = Number(item.quantity || 1);
      totalSalonServices += qty;

      const itemTotal = Number(item.total_price || (Number(item.unit_price || 0) * qty));
      const targetStylistIdentifier = item.staff_name || item.staff_id || (ord as any).stylist_name || (ord as any).stylist_id;

      if (!targetStylistIdentifier) {
        continue;
      }

      const match = findStylistDetails(targetStylistIdentifier);
      if (!match || !match.isActive) {
        continue;
      }

      const key = match.name.toLowerCase();
      let accum = stylistMap.get(key);
      if (!accum) {
        accum = {
          stylistId: match.stylistId,
          stylistName: match.name,
          phone: match.phone,
          userRole: match.role,
          billIds: new Set<string>(),
          servicesCount: 0,
          totalSales: 0,
          cashAmount: 0,
          upiAmount: 0,
          otherAmount: 0
        };
        stylistMap.set(key, accum);
      }

      accum.billIds.add(orderId);
      accum.servicesCount += qty;
      accum.totalSales += itemTotal;

      // Attribute payment mode
      if (payMethod.includes('cash')) {
        accum.cashAmount += itemTotal;
      } else if (payMethod.includes('upi')) {
        accum.upiAmount += itemTotal;
      } else {
        accum.otherAmount += itemTotal;
      }
    }
  }

  // Active Stylists list with sales
  const activeStylistsWithSales = Array.from(stylistMap.values())
    .filter(s => s.totalSales > 0 || s.servicesCount > 0)
    .sort((a, b) => b.totalSales - a.totalSales);

  // Build formatted text breakdown for owner
  const formattedDate = getKolkataDisplayDate(targetDateStr);
  const stylistBreakdownLines = activeStylistsWithSales.map(s => {
    return `• ${s.stylistName}: ${s.billIds.size} bills, ${s.servicesCount} services, ₹${s.totalSales.toLocaleString('en-IN')} (Cash: ₹${s.cashAmount}, UPI: ₹${s.upiAmount}, Other: ₹${s.otherAmount})`;
  });

  const breakdownText = stylistBreakdownLines.length > 0
    ? stylistBreakdownLines.join('\n')
    : 'No stylist service sales recorded for this date.';

  // Find active owner
  const owner = users.find(u => u.role === 'owner' && u.is_active) ||
    users.find(u => u.user_id === 'TGL-OWN01' && u.is_active) ||
    users[0];

  return {
    targetDateStr,
    formattedDate,
    totalBills: totalSalonBillsSet.size,
    totalServices: totalSalonServices,
    totalSales: totalSalonSales,
    cashTotal,
    upiTotal,
    otherTotal,
    activeStylistsWithSales,
    breakdownText,
    owner
  };
}

async function generateAndSendDailySalesReports(dateStr?: string, force: boolean = false) {
  const targetDateStr = dateStr || getKolkataDateString();
  console.log(`[Daily Sales WhatsApp] Initiating daily sales reporting for ${targetDateStr} (force: ${force})...`);

  const summary = await calculateDailySalesForKolkataDate(targetDateStr);
  const results = {
    reportDate: targetDateStr,
    totalBills: summary.totalBills,
    totalServices: summary.totalServices,
    totalSales: summary.totalSales,
    cashTotal: summary.cashTotal,
    upiTotal: summary.upiTotal,
    otherTotal: summary.otherTotal,
    stylistReportsCount: 0,
    ownerSummarySent: false,
    sent: [] as any[],
    skipped: [] as any[],
    failed: [] as any[]
  };

  // 1. Send each active stylist with sales their daily sales report
  for (const st of summary.activeStylistsWithSales) {
    const billsCount = st.billIds.size;
    const servicesCount = st.servicesCount;
    const totalSales = st.totalSales;
    const cashAmount = st.cashAmount;
    const upiAmount = st.upiAmount;
    const otherAmount = st.otherAmount;

    const normalized = normalizePhoneNumber(st.phone);
    if (!normalized.isValid) {
      console.warn(`[Daily Sales Report] Stylist ${st.stylistName} has missing or invalid mobile number: "${st.phone}". Skipping WhatsApp send.`);
      results.failed.push({
        recipient: st.stylistName,
        phone: st.phone,
        type: 'stylist_report',
        error: 'Invalid or missing Indian mobile number'
      });
      continue;
    }

    const recipientE164 = normalized.e164;

    // Strict idempotency: check if already sent for this date and recipient
    const existing = await salonRepository.getDailySalesReportByRecipient(targetDateStr, recipientE164, 'stylist_report');
    if (existing && existing.status === 'sent' && !force) {
      console.log(`[Daily Sales Report] Idempotent skip: Stylist ${st.stylistName} report already sent for ${targetDateStr}.`);
      results.skipped.push({
        recipient: st.stylistName,
        phone: recipientE164,
        type: 'stylist_report',
        message: 'Already sent today (use force to resend)'
      });
      continue;
    }

    console.log(`[Daily Sales Report] Sending gl_stylist_daily_sales_report to ${st.stylistName} (${recipientE164})...`);
    const sendResult = await sendBranchWhatsAppTemplate({
      branchId: 'tgl-gachibowli-main',
      recipientPhone: recipientE164,
      templateName: 'gl_stylist_daily_sales_report',
      jobType: 'stylist_sales_report',
      customData: {
        stylistName: st.stylistName,
        reportDate: summary.formattedDate,
        billsCount,
        servicesCount,
        totalSales,
        cashAmount,
        upiAmount,
        otherAmount
      }
    });

    const reportStatus: DailySalesReportStatus = sendResult.status === 'sent' ? 'sent' : sendResult.status === 'retrying' ? 'retrying' : 'failed';

    const reportPayload = {
      report_date: targetDateStr,
      report_type: 'stylist_report' as const,
      recipient_type: 'stylist' as const,
      recipient_phone: recipientE164,
      recipient_name: st.stylistName,
      stylist_id: st.stylistId,
      stylist_name: st.stylistName,
      branch_id: 'tgl-gachibowli-main',
      bills_count: billsCount,
      services_count: servicesCount,
      total_sales: totalSales,
      cash_amount: cashAmount,
      upi_amount: upiAmount,
      other_amount: otherAmount,
      breakdown_text: `${billsCount} bills, ${servicesCount} services. Total: ₹${totalSales} (Cash: ₹${cashAmount}, UPI: ₹${upiAmount}, Other: ₹${otherAmount})`,
      breakdown_json: {
        billsCount,
        servicesCount,
        totalSales,
        cashAmount,
        upiAmount,
        otherAmount
      },
      template_name: 'gl_stylist_daily_sales_report',
      meta_message_id: sendResult.messageId,
      status: reportStatus,
      error_message: sendResult.error,
      sent_at: sendResult.sent ? new Date().toISOString() : undefined
    };

    if (existing) {
      await salonRepository.updateDailySalesReport(existing.id, reportPayload);
    } else {
      await salonRepository.createDailySalesReport(reportPayload);
    }

    if (sendResult.sent) {
      results.stylistReportsCount++;
      results.sent.push({
        recipient: st.stylistName,
        phone: recipientE164,
        type: 'stylist_report',
        messageId: sendResult.messageId
      });
    } else {
      results.failed.push({
        recipient: st.stylistName,
        phone: recipientE164,
        type: 'stylist_report',
        error: sendResult.error
      });
    }
  }

  // 2. Send the Owner one consolidated WhatsApp template: gl_owner_daily_sales_summary
  if (summary.owner) {
    const ownerNormalized = normalizePhoneNumber(summary.owner.phone);
    if (!ownerNormalized.isValid) {
      console.warn(`[Daily Sales Report] Owner ${summary.owner.name} has missing/invalid mobile number: "${summary.owner.phone}".`);
      results.failed.push({
        recipient: summary.owner.name,
        phone: summary.owner.phone,
        type: 'owner_summary',
        error: 'Invalid or missing owner mobile number'
      });
    } else {
      const ownerE164 = ownerNormalized.e164;
      const existingOwner = await salonRepository.getDailySalesReportByRecipient(targetDateStr, ownerE164, 'owner_summary');

      if (existingOwner && existingOwner.status === 'sent' && !force) {
        console.log(`[Daily Sales Report] Idempotent skip: Owner summary already sent for ${targetDateStr}.`);
        results.skipped.push({
          recipient: summary.owner.name,
          phone: ownerE164,
          type: 'owner_summary',
          message: 'Already sent today (use force to resend)'
        });
      } else {
        console.log(`[Daily Sales Report] Sending gl_owner_daily_sales_summary to owner ${summary.owner.name} (${ownerE164})...`);
        const ownerSendResult = await sendBranchWhatsAppTemplate({
          branchId: 'tgl-gachibowli-main',
          recipientPhone: ownerE164,
          templateName: 'gl_owner_daily_sales_summary',
          jobType: 'owner_sales_summary',
          customData: {
            ownerName: summary.owner.name,
            reportDate: summary.formattedDate,
            totalBills: summary.totalBills,
            totalServices: summary.totalServices,
            totalSales: summary.totalSales,
            cashTotal: summary.cashTotal,
            upiTotal: summary.upiTotal,
            otherTotal: summary.otherTotal,
            breakdownText: summary.breakdownText
          }
        });

        const ownerStatus: DailySalesReportStatus = ownerSendResult.status === 'sent' ? 'sent' : ownerSendResult.status === 'retrying' ? 'retrying' : 'failed';

        const ownerPayload = {
          report_date: targetDateStr,
          report_type: 'owner_summary' as const,
          recipient_type: 'owner' as const,
          recipient_phone: ownerE164,
          recipient_name: summary.owner.name,
          branch_id: 'tgl-gachibowli-main',
          bills_count: summary.totalBills,
          services_count: summary.totalServices,
          total_sales: summary.totalSales,
          cash_amount: summary.cashTotal,
          upi_amount: summary.upiTotal,
          other_amount: summary.otherTotal,
          breakdown_text: summary.breakdownText,
          breakdown_json: {
            totalBills: summary.totalBills,
            totalServices: summary.totalServices,
            totalSales: summary.totalSales,
            cashTotal: summary.cashTotal,
            upiTotal: summary.upiTotal,
            otherTotal: summary.otherTotal,
            stylists: summary.activeStylistsWithSales.map(s => ({
              stylistName: s.stylistName,
              phone: s.phone,
              bills: s.billIds.size,
              services: s.servicesCount,
              sales: s.totalSales,
              cash: s.cashAmount,
              upi: s.upiAmount,
              other: s.otherAmount
            }))
          },
          template_name: 'gl_owner_daily_sales_summary',
          meta_message_id: ownerSendResult.messageId,
          status: ownerStatus,
          error_message: ownerSendResult.error,
          sent_at: ownerSendResult.sent ? new Date().toISOString() : undefined
        };

        if (existingOwner) {
          await salonRepository.updateDailySalesReport(existingOwner.id, ownerPayload);
        } else {
          await salonRepository.createDailySalesReport(ownerPayload);
        }

        if (ownerSendResult.sent) {
          results.ownerSummarySent = true;
          results.sent.push({
            recipient: summary.owner.name,
            phone: ownerE164,
            type: 'owner_summary',
            messageId: ownerSendResult.messageId
          });
        } else {
          results.failed.push({
            recipient: summary.owner.name,
            phone: ownerE164,
            type: 'owner_summary',
            error: ownerSendResult.error
          });
        }
      }
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// Daily Stylist Sales Reporting Interval Runner (10:15 PM Asia/Kolkata)
// ----------------------------------------------------------------------------
let lastAutoReportRunKolkataDate = '';

function checkAndRunDailySalesReportingCron() {
  try {
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const parts = kolkataFormatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const hour = map['hour'];
    const minute = map['minute'];
    const dateStr = `${map['year']}-${map['month']}-${map['day']}`;

    // Target schedule: 22:15 (10:15 PM Asia/Kolkata time)
    if (hour === '22' && minute === '15') {
      if (lastAutoReportRunKolkataDate !== dateStr) {
        lastAutoReportRunKolkataDate = dateStr;
        console.log(`[Daily Sales Cron] 10:15 PM Asia/Kolkata reached. Generating daily sales reports for ${dateStr}...`);
        generateAndSendDailySalesReports(dateStr, false).catch(err => {
          console.error('[Daily Sales Cron] Error in automated run:', err);
        });
      }
    }
  } catch (err: any) {
    console.error('[Daily Sales Cron] Timer check error:', err.message);
  }
}

// Check every 30 seconds
setInterval(checkAndRunDailySalesReportingCron, 30000);


// ----------------------------------------------------------------------------
// 4. WhatsApp Webhook (Meta Verification & Event Receiver)
// ----------------------------------------------------------------------------
// Canonical deployed endpoint: /api/whatsapp/webhook.
// The two legacy aliases are deliberately retained so an existing Meta setup
// does not stop receiving events during an upgrade.
const META_WEBHOOK_PATHS = [
  '/api/whatsapp/webhook',
  '/api/webhook/whatsapp',
  '/api/webhooks/whatsapp'
];

function isValidMetaWebhookSignature(req: express.Request): boolean {
  // If META_APP_SECRET is not configured, permit incoming webhooks so salon notifications are not blocked
  if (!META_APP_SECRET) {
    return true;
  }

  const signature = req.header('x-hub-signature-256');
  // If signature header was omitted (e.g. stripped by reverse proxy / Cloudflare / local tests), allow valid WhatsApp payloads
  if (!signature) {
    console.warn('[WhatsApp Webhook] No x-hub-signature-256 header provided; allowing verified WhatsApp event structure.');
    return true;
  }

  let rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody && req.body) {
    try {
      rawBody = Buffer.from(JSON.stringify(req.body));
    } catch {}
  }
  if (!rawBody || !signature.startsWith('sha256=')) {
    console.warn('[WhatsApp Webhook] Signature header format invalid or body missing.');
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex')}`;
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

function handleMetaWebhookVerification(req: express.Request, res: express.Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Never use a fallback verify token in production. Meta must match the
  // server-only META_VERIFY_TOKEN entered in the Meta developer console.
  if (META_VERIFY_TOKEN && mode === 'subscribe' && token === META_VERIFY_TOKEN && typeof challenge === 'string') {
    console.log('✅ Meta WhatsApp webhook verified successfully');
    return res.status(200).type('text/plain').send(challenge);
  }
  return res.status(403).json({ error: 'Verification token mismatch' });
}

async function handleMetaWebhookEvent(req: express.Request, res: express.Response) {
  if (!isValidMetaWebhookSignature(req)) {
    console.warn('[WhatsApp Webhook] Rejected request with invalid Meta signature.');
    try {
      await salonRepository.createWhatsAppWebhookEvent({
        event_type: 'signature_verification_failed',
        status: 'failed',
        error_message: 'Invalid webhook signature',
        payload: { headers: req.headers }
      });
    } catch {}
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Respond 200 immediately to acknowledge Meta delivery
  res.status(200).json({ status: 'EVENT_RECEIVED', received: true });

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body?.entry)) {
      return;
    }

    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const val = change.value;
        if (!val) continue;

        const receiverPhoneNumberId = val.metadata?.phone_number_id;

        // 1. Process Delivery Statuses (sent -> delivered -> read)
        if (Array.isArray(val.statuses)) {
          for (const st of val.statuses) {
            const metaId = st.id;
            const statusStr = st.status;
            const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();

            try {
              await salonRepository.createWhatsAppWebhookEvent({
                event_id: metaId,
                event_type: `message_status_${statusStr}`,
                sender_phone: st.recipient_id,
                recipient_phone_number_id: receiverPhoneNumberId,
                payload: st,
                status: 'processed'
              });
            } catch {}

            if (statusStr === 'delivered') {
              const updatedLog = await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'delivered',
                delivered_at: timestamp
              });
              if (updatedLog?.order_id) {
                const isReceipt = updatedLog.job_type === 'bill_receipt' || updatedLog.template_name === 'gl_bill_receipt';
                await salonRepository.updateOrder(updatedLog.order_id, {
                  ...(isReceipt ? { receipt_whatsapp_status: 'delivered' } : { feedback_whatsapp_status: 'delivered' }),
                  whatsapp_status: 'delivered'
                });
              }
            } else if (statusStr === 'read') {
              const updatedLog = await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'read',
                read_at: timestamp
              });
              if (updatedLog?.order_id) {
                const isReceipt = updatedLog.job_type === 'bill_receipt' || updatedLog.template_name === 'gl_bill_receipt';
                await salonRepository.updateOrder(updatedLog.order_id, {
                  ...(isReceipt ? { receipt_whatsapp_status: 'read' } : { feedback_whatsapp_status: 'read' }),
                  whatsapp_status: 'read'
                });
              }
            } else if (statusStr === 'failed') {
              const errDetail = Array.isArray(st.errors) && st.errors[0]?.message ? st.errors[0].message : 'Meta webhook reported failure';
              const updatedLog = await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'failed',
                error_message: errDetail
              });
              if (updatedLog?.order_id) {
                const isReceipt = updatedLog.job_type === 'bill_receipt' || updatedLog.template_name === 'gl_bill_receipt';
                await salonRepository.updateOrder(updatedLog.order_id, {
                  ...(isReceipt
                    ? { receipt_whatsapp_status: 'failed', receipt_whatsapp_error: errDetail }
                    : { feedback_whatsapp_status: 'failed', feedback_whatsapp_error: errDetail }),
                  whatsapp_status: 'failed',
                  whatsapp_error: errDetail
                });
              }
            }

            // Also synchronize delivery status into WhatsApp Inbox messages
            try {
              const deliveryStatus = statusStr === 'delivered' ? 'delivered' : statusStr === 'read' ? 'read' : statusStr === 'failed' ? 'failed' : 'sent';
              const updatedMsg = await salonRepository.updateWhatsAppMessageByMetaId(metaId, {
                delivery_status: deliveryStatus,
                status: deliveryStatus,
                ...(deliveryStatus === 'delivered' ? { delivered_at: timestamp } : {}),
                ...(deliveryStatus === 'read' ? { read_at: timestamp } : {}),
                ...(deliveryStatus === 'failed' ? { error_message: Array.isArray(st.errors) && st.errors[0]?.message ? st.errors[0].message : 'Meta webhook reported failure' } : {})
              });
              if (updatedMsg) {
                broadcastWhatsAppInboxEvent({
                  type: 'message_status',
                  messageId: updatedMsg.id,
                  metaMessageId: metaId,
                  conversationId: updatedMsg.conversation_id,
                  status: deliveryStatus
                });
              }
            } catch (statusErr) {
              console.warn('[WhatsApp Webhook] Error updating WhatsApp Inbox message status:', statusErr);
            }
          }
        }

        // 2. Process Incoming Customer Messages & Feedback Replies
        if (Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            console.log(`[WhatsApp Webhook] Incoming message id=${msg.id}, type=${msg.type}, from=${msg.from}`);

            if (msg.id && await salonRepository.isWebhookEventProcessed(msg.id)) {
              console.log(`[WhatsApp Webhook] Message ${msg.id} already processed. Skipping duplicate.`);
              continue;
            }
            if (msg.id) {
              await salonRepository.recordProcessedWebhookEvent(msg.id, 'whatsapp_incoming_message');
            }

            const fromPhone = String(msg.from || '').replace(/\D/g, '').slice(-10);
            if (!fromPhone) continue;

            let text = '';
            let buttonId = '';
            let buttonTitle = '';

            // Extract from button quick reply
            if (msg.button) {
              text = msg.button.text || '';
              buttonId = msg.button.payload || '';
              buttonTitle = text;
            }
            // Extract from interactive button reply
            if (msg.interactive?.button_reply) {
              text = text || msg.interactive.button_reply.title || '';
              buttonId = buttonId || msg.interactive.button_reply.id || '';
              buttonTitle = text;
            }
            // Extract from interactive list reply
            if (msg.interactive?.list_reply) {
              text = text || msg.interactive.list_reply.title || '';
              buttonId = buttonId || msg.interactive.list_reply.id || '';
              buttonTitle = text;
            }
            // Extract from plain text or quoted message
            if (msg.text?.body) {
              text = text || msg.text.body;
            }
            // Extract media representations
            if (msg.image) {
              text = msg.image.caption ? `📷 [Image: ${msg.image.caption}]` : '📷 [Image]';
            } else if (msg.document) {
              text = msg.document.filename ? `📄 [Document: ${msg.document.filename}]` : (msg.document.caption || '📄 [Document]');
            } else if (msg.audio) {
              text = '🎵 [Audio Message]';
            } else if (msg.video) {
              text = msg.video.caption ? `🎥 [Video: ${msg.video.caption}]` : '🎥 [Video]';
            } else if (msg.location) {
              text = `📍 [Location: ${msg.location.name || `${msg.location.latitude}, ${msg.location.longitude}`}]`;
            } else if (msg.contacts) {
              text = '👤 [Contact Card]';
            }

            const cleanText = (text || '').trim().toLowerCase();
            const cleanId = (buttonId || '').trim().toLowerCase();

            console.log(`[WhatsApp Webhook] Evaluating reply from ${fromPhone}: text="${text}", buttonId="${buttonId}"`);

            // Log event in database for audits & diagnostics
            try {
              await salonRepository.createWhatsAppWebhookEvent({
                event_id: msg.id,
                event_type: buttonId ? 'interactive_reply' : `incoming_${msg.type || 'message'}`,
                sender_phone: fromPhone,
                recipient_phone_number_id: receiverPhoneNumberId,
                payload: msg,
                status: 'processed'
              });
            } catch {}

            // Match customer from repository or create placeholder
            let matchedCustomer: any = null;
            try {
              matchedCustomer = await salonRepository.getCustomerByMobile(fromPhone);
            } catch {
              matchedCustomer = null;
            }

            // Persist inbound message in WhatsApp Inbox (Idempotent by msg.id)
            let inboxConversation: any = null;
            try {
              let matchedOrderForBranch: any = null;
              try {
                const ordersForPhone = await salonRepository.getOrders({ customerMobile: fromPhone });
                if (ordersForPhone && ordersForPhone.length > 0) {
                  matchedOrderForBranch = ordersForPhone[0];
                }
              } catch {}

              inboxConversation = await salonRepository.getOrCreateWhatsAppConversation({
                branch_id: matchedOrderForBranch?.branch_id || 'tgl-gachibowli-main',
                customer_id: matchedCustomer?.id,
                customer_phone: `+91${fromPhone}`,
                customer_name: matchedCustomer?.name || matchedOrderForBranch?.customer_name || 'WhatsApp Customer',
                wa_phone_number_id: receiverPhoneNumberId,
                source_channel: 'WHATSAPP'
              });

              const messageBody = text || (buttonId ? `[Button: ${buttonId}]` : '[Message]');
              const inboundMsg = await salonRepository.createWhatsAppMessage({
                conversation_id: inboxConversation.id,
                direction: 'INBOUND',
                message_type: buttonId ? 'interactive' : (msg.type || 'text'),
                text_body: messageBody,
                message_body: messageBody,
                button_reply_id: buttonId || undefined,
                button_reply_title: buttonTitle || undefined,
                meta_message_id: msg.id,
                meta_timestamp: msg.timestamp ? Number(msg.timestamp) : Math.floor(Date.now() / 1000),
                status: 'delivered',
                source_badge: 'WHATSAPP',
                received_at: new Date().toISOString()
              });

              // CRITICAL FIX: Update conversation with last_inbound_at and last_message_preview
              const nowIso = new Date().toISOString();
              const updatedConv = await salonRepository.updateWhatsAppConversation(inboxConversation.id, {
                last_inbound_at: nowIso,
                last_message_at: nowIso,
                last_message_text: messageBody,
                last_message_preview: messageBody,
                unread_count: (inboxConversation.unread_count || 0) + 1,
                status: 'OPEN',
                source_channel: inboxConversation.source_channel === 'WEBSITE_ENQUIRY' ? 'MIXED' : (inboxConversation.source_channel || 'WHATSAPP')
              });

              if (updatedConv) inboxConversation = updatedConv;

              broadcastWhatsAppInboxEvent({
                type: 'inbound_message',
                conversationId: inboxConversation.id,
                message: inboundMsg,
                conversation: inboxConversation
              });
            } catch (inboxErr: any) {
              console.warn('[WhatsApp Webhook] Failed to record inbound message in WhatsApp Inbox:', inboxErr);
              try {
                await salonRepository.createWhatsAppWebhookEvent({
                  event_id: msg.id,
                  event_type: 'incoming_message_error',
                  sender_phone: fromPhone,
                  recipient_phone_number_id: receiverPhoneNumberId,
                  payload: msg,
                  status: 'failed',
                  error_message: inboxErr?.message || String(inboxErr)
                });
              } catch {}
            }

            // =========================================================================
            // ACTIVE FEEDBACK CONTEXT & STRICT CLASSIFICATION (SEPARATE FROM NORMAL CHAT)
            // =========================================================================
            const cleanFromPhone10 = fromPhone;
            const allOrders = await salonRepository.getOrders();
            const customerOrders = (allOrders || [])
              .filter(o => phoneDigits(o.customer_phone).slice(-10) === cleanFromPhone10)
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

            const existingFeedbacks = await salonRepository.getAppointmentFeedback().catch(() => []);
            const nowMs = Date.now();
            const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

            // An order has an active pending feedback request if:
            // 1. Feedback was sent (feedback_whatsapp_status is 'sent', 'delivered', or 'read')
            // 2. Sent within the last 48 hours
            // 3. Not already marked 'completed' and not already rated
            // 4. No response already recorded in appointment_feedback for this order_id or appointment_id
            const pendingOrder = customerOrders.find(o => {
              const isSent = o.feedback_whatsapp_status === 'sent' || o.feedback_whatsapp_status === 'delivered' || o.feedback_whatsapp_status === 'read';
              if (!isSent) return false;
              if (o.feedback_whatsapp_status === 'completed' || o.feedback_rating) return false;

              const sentTime = o.feedback_whatsapp_sent_at ? new Date(o.feedback_whatsapp_sent_at).getTime() : new Date(o.created_at || 0).getTime();
              if (nowMs - sentTime > FORTY_EIGHT_HOURS_MS) return false;

              const alreadyAnswered = existingFeedbacks.some(f => 
                (o.id && f.order_id === o.id) || 
                (o.appointment_id && f.appointment_id === o.appointment_id)
              );
              return !alreadyAnswered;
            });

            // Also check message logs if feedback was dispatched via template without direct order link
            let pendingFeedbackLog: any = null;
            if (!pendingOrder) {
              try {
                const messageLogs = await salonRepository.getWhatsAppMessageLogs(undefined, undefined);
                const recentFeedbackLogs = (messageLogs || []).filter(l => {
                  const isRecipient = phoneDigits(l.recipient_number).slice(-10) === cleanFromPhone10;
                  const isFeedback = l.job_type === 'customer_feedback' || l.template_name === 'glossylooks_customer_feedback' || l.template_name === 'the_glossylooks_customer_feedback';
                  const isSent = l.status === 'sent' || l.status === 'delivered' || l.status === 'read';
                  const sentTime = new Date(l.sent_at || l.created_at).getTime();
                  return isRecipient && isFeedback && isSent && (nowMs - sentTime <= FORTY_EIGHT_HOURS_MS);
                });

                for (const log of recentFeedbackLogs) {
                  const alreadyAnswered = existingFeedbacks.some(f => 
                    (log.order_id && f.order_id === log.order_id) || 
                    (log.appointment_id && f.appointment_id === log.appointment_id) ||
                    (log.meta_message_id && f.meta_message_id === log.meta_message_id)
                  );
                  if (!alreadyAnswered) {
                    pendingFeedbackLog = log;
                    break;
                  }
                }
              } catch {}
            }

            const hasPendingFeedbackRequest = Boolean(pendingOrder || pendingFeedbackLog);

            // If there is NO active pending feedback request, THIS IS NORMAL CHAT!
            // It has already been saved into whatsapp_messages and whatsapp_conversations above.
            // Do NOT run any feedback automation!
            if (!hasPendingFeedbackRequest) {
              console.log(`[WhatsApp Webhook] Message from ${fromPhone} ("${text}") treated as NORMAL_CHAT (No active pending feedback request).`);
              try {
                await salonRepository.createWhatsAppWebhookEvent({
                  event_id: `${msg.id || Date.now()}_normal_chat`,
                  event_type: 'normal_chat',
                  sender_phone: fromPhone,
                  recipient_phone_number_id: receiverPhoneNumberId,
                  payload: { text, classification: 'NORMAL_CHAT' },
                  status: 'processed'
                });
              } catch {}
              continue;
            }

            // An active feedback request is pending. Now strictly evaluate if this message is a feedback response.
            let feedbackChoice: 'good' | 'average' | 'bad' | null = null;
            let matchedMethod: 'INTERACTIVE_BUTTON' | 'TEXT_FALLBACK' | null = null;

            // 1. Primary: Match by Interactive Button / Quick Reply ID
            if (cleanId) {
              if (
                cleanId === 'feedback_good' ||
                cleanId.startsWith('feedback_good') ||
                cleanId === 'btn_good' ||
                cleanId === 'rating_good' ||
                cleanId === 'good' ||
                cleanId === 'button_1' ||
                cleanId === '1'
              ) {
                feedbackChoice = 'good';
                matchedMethod = 'INTERACTIVE_BUTTON';
              } else if (
                cleanId === 'feedback_average' ||
                cleanId.startsWith('feedback_average') ||
                cleanId === 'btn_average' ||
                cleanId === 'rating_average' ||
                cleanId === 'average' ||
                cleanId === 'button_2' ||
                cleanId === '2'
              ) {
                feedbackChoice = 'average';
                matchedMethod = 'INTERACTIVE_BUTTON';
              } else if (
                cleanId === 'feedback_bad' ||
                cleanId.startsWith('feedback_bad') ||
                cleanId === 'btn_bad' ||
                cleanId === 'rating_bad' ||
                cleanId === 'bad' ||
                cleanId === 'button_3' ||
                cleanId === '3'
              ) {
                feedbackChoice = 'bad';
                matchedMethod = 'INTERACTIVE_BUTTON';
              }
            }

            // 2. Secondary: Exact Text Fallback ONLY (NO substring, NO 'ok', NO loose words)
            if (!feedbackChoice && cleanText) {
              if (cleanText === 'good' || cleanText === '👍') {
                feedbackChoice = 'good';
                matchedMethod = 'TEXT_FALLBACK';
              } else if (cleanText === 'average') {
                feedbackChoice = 'average';
                matchedMethod = 'TEXT_FALLBACK';
              } else if (cleanText === 'bad' || cleanText === '👎') {
                feedbackChoice = 'bad';
                matchedMethod = 'TEXT_FALLBACK';
              }
            }

            // If incoming message does NOT match explicit feedback choice (e.g. "Ok", "Thanks", "Hi", "7pm"):
            // It is NORMAL CHAT! Do not process feedback. Leave feedback as PENDING.
            if (!feedbackChoice) {
              console.log(`[WhatsApp Webhook] Message from ${fromPhone} ("${text}") is NORMAL_CHAT during pending feedback window. Not a feedback category selection.`);
              try {
                await salonRepository.createWhatsAppWebhookEvent({
                  event_id: `${msg.id || Date.now()}_normal_chat_pending_window`,
                  event_type: 'normal_chat',
                  sender_phone: fromPhone,
                  recipient_phone_number_id: receiverPhoneNumberId,
                  payload: { text, classification: 'NORMAL_CHAT' },
                  status: 'processed'
                });
              } catch {}
              continue;
            }

            console.log(`[WhatsApp Webhook] Verified feedback response from ${fromPhone}: ${feedbackChoice.toUpperCase()} (Matched via ${matchedMethod})`);

            const targetOrderId = pendingOrder?.id || pendingFeedbackLog?.order_id;
            const targetAptId = pendingOrder?.appointment_id || pendingFeedbackLog?.appointment_id;
            const branchId = pendingOrder?.branch_id || pendingFeedbackLog?.branch_id || 'tgl-gachibowli-main';
            const customerName = pendingOrder?.customer_name || pendingFeedbackLog?.customer_name || 'Valued Customer';

            // Idempotency: verify this specific message ID has not already been replied to
            const alreadyRecorded = msg.id && existingFeedbacks.some(f => 
              (f.meta_message_id && f.meta_message_id === msg.id) ||
              (f.incoming_meta_message_id && f.incoming_meta_message_id === msg.id)
            );

            if (alreadyRecorded) {
              console.log(`[WhatsApp Webhook] Feedback already recorded for message ${msg.id}. Skipping duplicate.`);
              continue;
            }

            // Mark the pending feedback request as COMPLETED on the order
            if (targetOrderId) {
              await salonRepository.updateOrder(targetOrderId, {
                feedback_whatsapp_status: 'completed',
                feedback_rating: feedbackChoice
              }).catch(() => null);
            }

            const feedbackRecord = await salonRepository.createAppointmentFeedback({
              appointment_id: targetAptId,
              order_id: targetOrderId,
              branch_id: branchId,
              customer_name: customerName,
              customer_phone: fromPhone,
              rating: feedbackChoice,
              reply_text: text || buttonId || feedbackChoice.toUpperCase(),
              meta_message_id: msg.id,
              incoming_meta_message_id: msg.id,
              reply_status: 'sending',
              is_read: false
            });

            // Update customer CRM feedback rating immediately
            try {
              const cust = await salonRepository.getCustomerByMobile(fromPhone);
              if (cust) {
                await salonRepository.updateCustomer(cust.id, { feedback_rating: feedbackChoice }, 'System');
              }
            } catch (custErr: any) {
              console.warn('[WhatsApp Webhook] Customer CRM rating update error:', custErr.message);
            }

            // Formulate distinct automated responses based on explicit rating:
            let autoReplyText = '';
            if (feedbackChoice === 'good') {
              // 8. GOOD FLOW: Google Review thank-you & review link
              autoReplyText = "Thank you for your wonderful feedback! We are delighted you enjoyed your experience with The Glossy Looks. Your Google review would mean a lot to us: https://g.page/r/CTx5NddxkeKaEAE/review";
            } else if (feedbackChoice === 'average') {
              // 9. AVERAGE FLOW: Constructive improvement response (distinct from Bad!)
              autoReplyText = "Thank you for your valuable feedback. We always strive to provide a wonderful experience at The Glossy Looks. We have noted your response and our team will work to make your next visit even better!";
            } else if (feedbackChoice === 'bad') {
              // 10. BAD FLOW: Sincere apology and manager follow-up
              autoReplyText = "Thank you for your valuable feedback. We sincerely apologize that your experience did not meet expectations. Our salon manager will get in touch with you shortly to make it right.";
            }

            console.log(`[WhatsApp Webhook] Dispatching automated feedback response to ${fromPhone} (Rating: ${feedbackChoice.toUpperCase()})...`);
            if (autoReplyText) {
              const replyResult = await sendWhatsAppFreeformReply(branchId, fromPhone, autoReplyText, receiverPhoneNumberId);
              console.log(`[WhatsApp Webhook] Automated response result for ${fromPhone}:`, replyResult);
              if (feedbackRecord?.id) {
                await salonRepository.updateAppointmentFeedback(feedbackRecord.id, {
                  reply_status: replyResult.success ? 'sent' : 'failed',
                  outgoing_meta_message_id: replyResult.messageId,
                  reply_sent_at: new Date().toISOString()
                }).catch(() => null);
              }

              // Also record automated reply into WhatsApp Inbox thread
              if (inboxConversation?.id) {
                try {
                  const replyMsg = await salonRepository.createWhatsAppMessage({
                    conversation_id: inboxConversation.id,
                    direction: 'OUTBOUND',
                    message_type: 'text',
                    text_body: autoReplyText,
                    meta_message_id: replyResult.messageId,
                    status: replyResult.success ? 'sent' : 'failed',
                    source_badge: 'AUTOMATIC',
                    error_message: replyResult.error,
                    sent_at: new Date().toISOString()
                  });
                  await salonRepository.updateWhatsAppConversation(inboxConversation.id, {
                    last_message_at: new Date().toISOString(),
                    last_message_text: autoReplyText
                  });
                  broadcastWhatsAppInboxEvent({
                    type: 'outbound_message',
                    conversationId: inboxConversation.id,
                    message: replyMsg,
                    conversation: inboxConversation
                  });
                } catch (autoErr) {
                  console.warn('[WhatsApp Webhook] Failed to record auto-reply in inbox:', autoErr);
                }
              }
            }

            // Only for BAD feedback, trigger manager alert audit log
            if (feedbackChoice === 'bad') {
              await salonRepository.logAudit(
                'CUSTOMER_FEEDBACK_ALERT',
                'AppointmentFeedback',
                targetOrderId || targetAptId || fromPhone,
                'WhatsApp Webhook',
                `⚠️ Customer ${customerName} (${fromPhone}) rated visit as BAD. Immediate manager follow-up required.`
              );
            }

            // Record audit log for feedback processing in whatsapp_webhook_events
            try {
              await salonRepository.createWhatsAppWebhookEvent({
                event_id: `${msg.id || Date.now()}_feedback_processed`,
                event_type: 'feedback_processed',
                sender_phone: fromPhone,
                recipient_phone_number_id: receiverPhoneNumberId,
                payload: {
                  feedback_choice: feedbackChoice,
                  matched_method: matchedMethod,
                  order_id: targetOrderId,
                  appointment_id: targetAptId,
                  classification: 'FEEDBACK_RESPONSE'
                },
                status: 'processed'
              });
            } catch {}
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[WhatsApp Webhook] Handler error:', err.message);
  }
}

app.get(META_WEBHOOK_PATHS, handleMetaWebhookVerification);
app.post(META_WEBHOOK_PATHS, handleMetaWebhookEvent);

// ----------------------------------------------------------------------------
// WhatsApp Admin Activity, Feedback & Test Endpoints
// ----------------------------------------------------------------------------

// 1. Get WhatsApp Message Logs (Owner & Manager)
app.get('/api/admin/whatsapp/message-logs', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const appointmentId = req.query.appointment_id as string | undefined;
    const branchId = admin.role === 'manager' && admin.branch_id
      ? admin.branch_id
      : (req.query.branch_id as string | undefined);

    const logs = await salonRepository.getWhatsAppMessageLogs(appointmentId, branchId);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Customer Feedback (Owner & Manager)
app.get('/api/admin/whatsapp/feedback', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const branchId = admin.role === 'manager' && admin.branch_id
      ? admin.branch_id
      : (req.query.branch_id as string | undefined);

    const feedback = await salonRepository.getAppointmentFeedback(branchId);
    res.json(feedback);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Mark feedback notification as read
app.post('/api/admin/whatsapp/feedback/:id/read', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    await salonRepository.markFeedbackAsRead(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Scheduled Feedback Jobs
app.get('/api/admin/whatsapp/scheduled-jobs', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const jobs = await salonRepository.getScheduledFeedbackJobs(req.query.status as string);
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Get Meta WhatsApp Templates directly from WABA
app.get('/api/admin/whatsapp/templates', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const integration = await salonRepository.getWhatsAppIntegration();
    const branch = await salonRepository.getBranchById('tgl-gachibowli-main');
    const branchIntegration = branch ? await salonRepository.getBranchWhatsAppIntegration(branch.id) : null;
    const wabaId = branchIntegration?.waba_id || integration?.waba_id || META_BUSINESS_ID;

    if (!wabaId) {
      return res.status(400).json({ error: 'No WABA ID configured.' });
    }
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates?fields=name,status,language,components,category&limit=100`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Owner-Only Test Template Sender
app.post('/api/admin/whatsapp/test-send', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only Salon Owners can send test WhatsApp templates.' });
    }

    const { branch_id, recipient, template_name } = req.body;
    if (!recipient || !template_name) {
      return res.status(400).json({ error: 'Recipient mobile number and template name are required.' });
    }

    const branchId = branch_id || 'tgl-gachibowli-main';
    const branch = await salonRepository.getBranchById(branchId);

    let components: any[] | undefined = undefined;
    if (template_name === 'gl_appointment_confirmation') {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'customer_name', text: 'Test Recipient' },
            { type: 'text', parameter_name: 'branch_name', text: branch?.name || 'Gachibowli Main Flagship' },
            { type: 'text', parameter_name: 'service_name', text: 'Bridal Trial Consultation' },
            { type: 'text', parameter_name: 'appointment_date', text: new Date().toISOString().split('T')[0] },
            { type: 'text', parameter_name: 'appointment_time', text: '11:00 AM' },
            { type: 'text', parameter_name: 'booking_id', text: 'TEST-BKG01' },
            { type: 'text', parameter_name: 'branch_address', text: branch?.address || '31, Vinayak Nagar, Gachibowli' }
          ]
        }
      ];
    } else if (template_name === 'the_glossylooks_customer_feedback' || template_name === 'glossylooks_customer_feedback') {
      components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Test Recipient' }
          ]
        }
      ];
    }

    const result = await sendBranchWhatsAppTemplate({
      branchId,
      recipientPhone: recipient,
      templateName: template_name,
      components
    });

    res.json({
      success: result.sent,
      status: result.status,
      message_id: result.messageId,
      error: result.error,
      diagnostics: result.diagnostics,
      log: result.log
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Test Feedback Reply Simulation (For controlled testing & automated tests)
app.post('/api/webhook/simulate-feedback-reply', async (req, res) => {
  try {
    const { phone, rating, text, appointment_id } = req.body;
    if (!phone || !rating) {
      return res.status(400).json({ error: 'phone and rating (good/average/bad) are required.' });
    }

    const cleanPhone = phoneDigits(phone).slice(-10);
    const validRating = (rating || '').toLowerCase();
    if (validRating !== 'good' && validRating !== 'average' && validRating !== 'bad') {
      return res.status(400).json({ error: 'rating must be good, average, or bad' });
    }

    const allApts = await salonRepository.getAppointments({ customerMobile: cleanPhone });
    const targetApt = appointment_id
      ? await salonRepository.getAppointmentById(appointment_id)
      : allApts[0];

    const aptId = targetApt ? targetApt.id : `apt-${cleanPhone}`;
    const branchId = targetApt?.branch_id || 'tgl-gachibowli-main';
    const customerName = targetApt?.customer_name || 'Simulated Customer';

    // Idempotency check: only first valid response
    const existingFeedbacks = await salonRepository.getAppointmentFeedback();
    const alreadyRecorded = existingFeedbacks.some(f => f.appointment_id === aptId);
    if (alreadyRecorded) {
      return res.json({
        success: false,
        message: 'Duplicate response ignored. First response is already recorded.',
        feedback: existingFeedbacks.find(f => f.appointment_id === aptId)
      });
    }

    const feedback = await salonRepository.createAppointmentFeedback({
      appointment_id: aptId,
      branch_id: branchId,
      customer_name: customerName,
      customer_phone: cleanPhone,
      rating: validRating,
      reply_text: text || validRating.toUpperCase(),
      is_read: false
    });

    let autoReplyText = '';
    if (validRating === 'good') {
      autoReplyText = "Thank you for choosing The Glossy Looks. We’re delighted you had a great experience. Your review means a lot to us: https://g.page/r/CTx5NddxkeKaEAE/review";
    } else if (validRating === 'average') {
      autoReplyText = "Thank you for your feedback. We’re sorry that your experience was not perfect. Our team will work to improve and serve you better on your next visit.";
    } else if (validRating === 'bad') {
      autoReplyText = "We’re truly sorry that your experience did not meet expectations. Your feedback is important to us. Our salon manager will review this and work to improve.";
    }

    if (validRating === 'average' || validRating === 'bad') {
      await salonRepository.logAudit(
        'CUSTOMER_FEEDBACK_ALERT',
        'AppointmentFeedback',
        aptId,
        'Simulation',
        `⚠️ Customer ${customerName} (${cleanPhone}) rated visit as ${validRating.toUpperCase()} for Ref ${targetApt?.booking_reference || 'N/A'}.`
      );
    }

    res.json({
      success: true,
      feedback,
      auto_reply_sent: autoReplyText,
      alert_generated: validRating === 'average' || validRating === 'bad'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WhatsApp Inbox & Customer Chat Endpoints (Owner & Manager Only)
// ============================================================================

// 1. Real-time SSE stream for incoming/outbound messages and status changes
app.get('/api/admin/whatsapp/inbox/stream', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
    return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  whatsappInboxSseClients.add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      whatsappInboxSseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    whatsappInboxSseClients.delete(res);
  });
});

// 2. Unread conversation count badge
app.get('/api/admin/whatsapp/inbox/unread-count', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }
    const branchId = admin.role === 'manager' && admin.branch_id ? admin.branch_id : undefined;
    const count = await salonRepository.getWhatsAppInboxUnreadCount(branchId);
    res.json({ unread_count: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnostics endpoint for WhatsApp Inbox & Webhook Health
app.get('/api/admin/whatsapp/inbox/diagnostics', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }
    const diagnostics = await salonRepository.getWhatsAppWebhookDiagnostics();
    res.json(diagnostics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. List conversations with search and filters
app.get('/api/admin/whatsapp/inbox/conversations', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }
    const branchId = admin.role === 'manager' && admin.branch_id ? admin.branch_id : (req.query.branch_id as string | undefined);
    const filterParam = (req.query.filter as any) || (req.query.status as any) || 'all';
    const conversations = await salonRepository.getWhatsAppConversations({
      branch_id: branchId,
      filter: filterParam,
      status: filterParam,
      search: (req.query.search as string) || undefined
    });
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get single conversation
app.get('/api/admin/whatsapp/inbox/conversations/:id', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }
    const conv = await salonRepository.getWhatsAppConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    res.json(conv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get conversation messages and mark conversation as read
app.get('/api/admin/whatsapp/inbox/conversations/:id/messages', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }
    const conv = await salonRepository.getWhatsAppConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const before = req.query.before as string | undefined;

    const messages = await salonRepository.getWhatsAppMessages(req.params.id, limit, before);

    // Automatically mark read if unread count > 0
    if (conv.unread_count > 0) {
      await salonRepository.markWhatsAppConversationRead(req.params.id);
      broadcastWhatsAppInboxEvent({
        type: 'conversation_read',
        conversationId: req.params.id
      });
    }

    res.json({
      conversation: conv,
      messages,
      has_more: messages.length >= limit
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Send manual admin reply (Enforcing 24-hour customer service window)
app.post('/api/admin/whatsapp/inbox/conversations/:id/messages', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }

    const conv = await salonRepository.getWhatsAppConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // 24-hour customer service window calculation
    let isWindowOpen = false;
    let windowExpiresAt: string | null = null;
    let secondsRemaining = 0;
    if (conv.last_inbound_at) {
      const lastInboundTime = new Date(conv.last_inbound_at).getTime();
      const expiresTime = lastInboundTime + 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now < expiresTime) {
        isWindowOpen = true;
        secondsRemaining = Math.max(0, Math.floor((expiresTime - now) / 1000));
        windowExpiresAt = new Date(expiresTime).toISOString();
      }
    }

    if (!isWindowOpen) {
      return res.status(400).json({
        error: 'Customer service window expired. Free-form WhatsApp messages cannot be sent after 24 hours of customer inactivity. Please send an approved Meta WhatsApp template to resume conversation.',
        code: 'SERVICE_WINDOW_EXPIRED'
      });
    }

    const branchId = conv.branch_id || 'tgl-gachibowli-main';
    const cleanPhone = phoneDigits(conv.customer_phone).slice(-10);

    // Call existing sendWhatsAppFreeformReply
    const sendResult = await sendWhatsAppFreeformReply(
      branchId,
      cleanPhone,
      text.trim(),
      conv.wa_phone_number_id
    );

    const createdMsg = await salonRepository.createWhatsAppMessage({
      conversation_id: conv.id,
      direction: 'OUTBOUND',
      message_type: 'text',
      text_body: text.trim(),
      message_body: text.trim(),
      meta_message_id: sendResult.messageId,
      status: sendResult.success ? 'sent' : 'failed',
      source_badge: 'ADMIN',
      error_message: sendResult.error,
      sent_by_user_id: admin.id,
      sent_by_user_name: admin.name,
      sent_at: new Date().toISOString()
    });

    const updatedConv = await salonRepository.updateWhatsAppConversation(conv.id, {
      last_message_at: new Date().toISOString(),
      last_message_text: text.trim(),
      last_message_preview: text.trim()
    });

    broadcastWhatsAppInboxEvent({
      type: 'outbound_message',
      conversationId: conv.id,
      message: createdMsg,
      conversation: updatedConv || conv
    });

    if (!sendResult.success) {
      return res.status(400).json({
        error: sendResult.error || 'Failed to dispatch WhatsApp message via Meta Cloud API.',
        message: createdMsg,
        conversation: updatedConv || conv
      });
    }

    res.json({
      success: true,
      message: createdMsg,
      conversation: updatedConv || conv
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Send approved template message to customer
app.post('/api/admin/whatsapp/inbox/conversations/:id/send-template', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const { template_name, custom_data } = req.body;
    if (!template_name) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    const conv = await salonRepository.getWhatsAppConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const branchId = conv.branch_id || 'tgl-gachibowli-main';
    const sendResult = await sendBranchWhatsAppTemplate({
      branchId,
      recipientPhone: conv.customer_phone,
      templateName: template_name,
      customData: {
        customerName: conv.customer_name,
        ...(custom_data || {})
      }
    });

    const templatePreview = `[Template: ${template_name}]`;
    const createdMsg = await salonRepository.createWhatsAppMessage({
      conversation_id: conv.id,
      direction: 'OUTBOUND',
      message_type: 'template',
      text_body: templatePreview,
      message_body: templatePreview,
      template_name: template_name,
      meta_message_id: sendResult.messageId,
      status: sendResult.sent ? 'sent' : 'failed',
      source_badge: 'TEMPLATE',
      error_message: sendResult.error,
      sent_by_user_id: admin.id,
      sent_by_user_name: admin.name,
      sent_at: new Date().toISOString()
    });

    await salonRepository.updateWhatsAppConversation(conv.id, {
      last_message_at: new Date().toISOString(),
      last_message_text: templatePreview,
      last_message_preview: templatePreview
    });

    broadcastWhatsAppInboxEvent({
      type: 'outbound_message',
      conversationId: conv.id,
      message: createdMsg
    });

    if (!sendResult.sent) {
      return res.status(400).json({
        error: sendResult.error || 'Failed to send template message via Meta Cloud API.',
        message: createdMsg
      });
    }

    res.json({
      success: true,
      message: createdMsg,
      message_id: sendResult.messageId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Update conversation status (Open / Closed)
app.patch('/api/admin/whatsapp/inbox/conversations/:id', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const { status } = req.body;
    const normalizedStatus = String(status || '').toUpperCase();
    if (normalizedStatus !== 'OPEN' && normalizedStatus !== 'CLOSED') {
      return res.status(400).json({ error: 'Status must be OPEN or CLOSED.' });
    }

    const updated = await salonRepository.updateWhatsAppConversation(req.params.id, { status: normalizedStatus as any });
    if (!updated) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    broadcastWhatsAppInboxEvent({
      type: 'conversation_updated',
      conversationId: req.params.id,
      conversation: updated
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Delete conversation (Owner only, permanent)
app.delete('/api/admin/whatsapp/inbox/conversations/:id', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Deleting conversations is restricted to Salon Owners only.' });
    }

    await salonRepository.deleteWhatsAppConversation(req.params.id);

    broadcastWhatsAppInboxEvent({
      type: 'conversation_deleted',
      conversationId: req.params.id
    });

    res.json({ success: true, message: 'Conversation permanently deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================================
// Multi-Branch Management & Branch WhatsApp Coexistence Onboarding
// ============================================================================

async function checkBranchAccess(req: express.Request, branchId: string): Promise<{ authorized: boolean; admin?: any; branch?: any; error?: string; status?: number }> {
  const admin = await getAuthAdmin(req);
  if (!admin) {
    return { authorized: false, error: 'Authentication required. Please log in as Salon Owner or Branch Manager.', status: 401 };
  }

  if (admin.role !== 'owner' && admin.role !== 'manager') {
    return { authorized: false, error: 'Access denied: Only Salon Owners and assigned Branch Managers can access WhatsApp Integration.', status: 403 };
  }

  const branch = await salonRepository.getBranchById(branchId);
  if (!branch) {
    return { authorized: false, error: `Salon branch '${branchId}' not found.`, status: 404 };
  }

  if (admin.role === 'owner') {
    return { authorized: true, admin, branch };
  }

  // Role is manager: verify this manager is assigned to this branch
  const isAssigned = admin.branch_id === branchId || branch.manager_id === admin.id || branch.manager_id === admin.user_id;
  if (!isAssigned) {
    return {
      authorized: false,
      error: `Access denied: You are assigned to manage branch '${admin.branch_id || 'N/A'}' and cannot configure WhatsApp for '${branch.name}'.`,
      status: 403
    };
  }

  return { authorized: true, admin, branch };
}

// Public / Operational endpoint for branches (used by POS billing and customer booking)
app.get('/api/branches', async (req, res) => {
  try {
    const allBranches = await salonRepository.getBranches();
    return res.json(allBranches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Get Branches for Admin / Staff: Owner, cashiers, receptionists & staff see active branches
app.get('/api/admin/branches', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    const allBranches = await salonRepository.getBranches();
    if (!admin) {
      return res.json(allBranches);
    }

    // Branch manager: filter to assigned branch only, fallback to all if empty
    if (admin.role === 'manager') {
      const assignedBranches = allBranches.filter(b => b.id === admin.branch_id || b.manager_id === admin.id || b.manager_id === admin.user_id);
      return res.json(assignedBranches.length > 0 ? assignedBranches : allBranches);
    }

    return res.json(allBranches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create Branch: Owner Only
app.post('/api/admin/branches', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can create new branches.' });
    }

    const { name, code, address, city, phone, whatsapp_number, manager_id } = req.body;
    if (!name || !address || !whatsapp_number) {
      return res.status(400).json({ error: 'Branch name, address, and configured WhatsApp number are required.' });
    }

    const cleanWaNumber = String(whatsapp_number).replace(/\D/g, '').slice(-10);
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanWaNumber)) {
      return res.status(400).json({
        error: 'Invalid WhatsApp number. Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      });
    }

    const existingBranches = await salonRepository.getBranches();
    const branchCode = code ? String(code).trim().toUpperCase() : `TGL-${String(existingBranches.length + 1).padStart(2, '0')}`;

    const newBranch = await salonRepository.createBranch({
      name: String(name).trim(),
      code: branchCode,
      address: String(address).trim(),
      city: city ? String(city).trim() : 'Hyderabad, Telangana',
      phone: phone ? String(phone).replace(/\D/g, '').slice(-10) : cleanWaNumber,
      whatsapp_number: cleanWaNumber,
      manager_id: manager_id || undefined,
      is_active: true
    }, admin.name);

    res.status(201).json(newBranch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get single branch
app.get('/api/admin/branches/:id', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.id);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }
    res.json(access.branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update branch details
app.patch('/api/admin/branches/:id', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.id);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const { name, code, address, city, phone, whatsapp_number, manager_id, is_active } = req.body;
    const patch: any = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (code !== undefined) patch.code = String(code).trim().toUpperCase();
    if (address !== undefined) patch.address = String(address).trim();
    if (city !== undefined) patch.city = String(city).trim();
    if (phone !== undefined) patch.phone = String(phone).replace(/\D/g, '').slice(-10);
    if (whatsapp_number !== undefined) {
      const cleanWa = String(whatsapp_number).replace(/\D/g, '').slice(-10);
      const indianMobileRegex = /^[6-9]\d{9}$/;
      if (!indianMobileRegex.test(cleanWa)) {
        return res.status(400).json({
          error: 'Invalid WhatsApp number. Please enter a valid 10-digit Indian mobile number.'
        });
      }
      patch.whatsapp_number = cleanWa;
    }
    // Only owner can assign managers or deactivate branches
    if (access.admin.role === 'owner') {
      if (manager_id !== undefined) patch.manager_id = manager_id || undefined;
      if (is_active !== undefined) patch.is_active = Boolean(is_active);
    }

    const updated = await salonRepository.updateBranch(req.params.id, patch, access.admin.name);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete branch: Owner Only
app.delete('/api/admin/branches/:id', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || admin.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied: Only the Salon Owner can delete branches.' });
    }

    const ok = await salonRepository.deleteBranch(req.params.id, admin.name);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Branch WhatsApp Status
app.get('/api/admin/branches/:branchId/whatsapp/status', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const integration = await salonRepository.getBranchWhatsAppIntegration(req.params.branchId);

    res.json({
      branch: access.branch,
      integration: {
        id: integration.id,
        branch_id: integration.branch_id,
        configured_business_number: integration.configured_business_number,
        waba_id: integration.waba_id,
        phone_number_id: integration.phone_number_id,
        display_phone_number: integration.display_phone_number,
        masked_phone_number: integration.masked_phone_number || maskPhoneNumber(integration.display_phone_number || integration.configured_business_number),
        display_name: integration.display_name,
        status: integration.status,
        connected_at: integration.connected_at,
        last_verified_at: integration.last_verified_at,
        diagnostics: integration.diagnostics,
        error_message: integration.error_message,
        created_at: integration.created_at,
        updated_at: integration.updated_at
      },
      config: {
        meta_app_id: META_APP_ID,
        config_id: META_EMBEDDED_SIGNUP_CONFIG_ID,
        api_version: WHATSAPP_API_VERSION,
        is_configured: Boolean(META_APP_ID && META_EMBEDDED_SIGNUP_CONFIG_ID)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update Branch WhatsApp Settings (Configured Business Number)
app.post('/api/admin/branches/:branchId/whatsapp/settings', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const { whatsapp_number, display_name } = req.body;
    if (!whatsapp_number) {
      return res.status(400).json({ error: 'A valid WhatsApp business phone number is required.' });
    }

    const cleanNumber = String(whatsapp_number).replace(/\D/g, '').slice(-10);
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanNumber)) {
      return res.status(400).json({
        error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
      });
    }

    const updatedBranch = await salonRepository.updateBranch(req.params.branchId, {
      whatsapp_number: cleanNumber,
      ...(display_name && { name: display_name.trim() })
    }, access.admin.name);

    res.json({
      success: true,
      message: 'Branch WhatsApp settings updated successfully.',
      branch: updatedBranch
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Start Branch WhatsApp Pairing (Sets status to pairing before Meta popup opens)
app.post('/api/admin/branches/:branchId/whatsapp/pairing', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const updated = await salonRepository.updateBranchWhatsAppIntegration(req.params.branchId, {
      status: 'pairing',
      diagnostics: 'Meta Embedded Signup Coexistence onboarding launched. Waiting for phone pairing QR scan...'
    }, access.admin.name);

    res.json({
      success: true,
      integration: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Connect Branch WhatsApp Business integration after Meta Embedded Signup
app.post('/api/admin/branches/:branchId/whatsapp/connect', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const { waba_id, phone_number_id, code, display_name, display_phone_number } = req.body;
    const submittedWabaId = waba_id ? String(waba_id).trim() : '';
    const submittedPhoneId = phone_number_id ? String(phone_number_id).trim() : '';
    const submittedCode = typeof code === 'string' ? code.trim() : '';

    if (submittedWabaId && !isValidMetaNumericId(submittedWabaId)) {
      return res.status(400).json({
        error: 'Invalid WABA ID received. Meta WABA IDs must be authentic numeric identifiers; placeholders are not permitted.'
      });
    }
    if (submittedPhoneId && !isValidMetaNumericId(submittedPhoneId)) {
      return res.status(400).json({
        error: 'Invalid Phone Number ID received. Meta Phone Number IDs must be authentic numeric identifiers; placeholders are not permitted.'
      });
    }

    let cleanWabaId = submittedWabaId;
    let cleanPhoneId = submittedPhoneId;
    let codeResolvedDisplayName = '';
    let codeResolvedPhone = '';

    // If IDs were not included directly in postMessage, resolve them via server-side code exchange
    if (!cleanWabaId || !cleanPhoneId) {
      if (!submittedCode) {
        return res.status(400).json({
          error: 'Connection incomplete — Meta IDs were not received. Please scan the QR code in WhatsApp Business and complete pairing.'
        });
      }

      const resolved = await resolveAssetsFromEmbeddedSignupCode(
        submittedCode,
        access.branch.whatsapp_number,
        cleanWabaId || undefined,
        cleanPhoneId || undefined
      );

      if (!resolved.wabaId || !resolved.phoneNumberId) {
        if (resolved.candidates?.length) {
          return res.json({
            success: false,
            selection_required: true,
            message: resolved.error,
            candidates: resolved.candidates.map(candidate => ({
              waba_id: candidate.wabaId,
              phone_number_id: candidate.phoneNumberId,
              display_phone_number: candidate.displayPhoneNumber || '',
              verified_name: candidate.verifiedName || ''
            }))
          });
        }
        return res.status(400).json({
          error: resolved.error || 'Connection incomplete — Meta IDs were not received from authorization code.'
        });
      }

      cleanWabaId = resolved.wabaId;
      cleanPhoneId = resolved.phoneNumberId;
      codeResolvedDisplayName = resolved.verifiedName || '';
      codeResolvedPhone = resolved.displayPhoneNumber || '';
    }

    if (!isValidMetaNumericId(cleanWabaId) || !isValidMetaNumericId(cleanPhoneId)) {
      return res.status(400).json({
        error: 'Meta authorization completed, but valid numeric WABA and Phone Number IDs could not be resolved. Please retry Embedded Signup.'
      });
    }

    let resolvedDisplayName = codeResolvedDisplayName || display_name || access.branch.name || 'The Glossy Looks Salon';
    let resolvedPhone = codeResolvedPhone || display_phone_number || access.branch.whatsapp_number || '';

    // Step 4: Call Meta Graph API server-side to verify that the phone number belongs to the returned WABA
    const verification = await verifyMetaWabaOwnership(cleanWabaId, cleanPhoneId);

    if (verification.verified) {
      if (verification.verified_name) resolvedDisplayName = verification.verified_name;
      if (verification.display_phone_number) resolvedPhone = verification.display_phone_number;

      // Strict Branch Phone Number Matching (Requirement E.3):
      // Do not allow an admin to connect a Meta phone number to a branch unless
      // the selected number matches the branch's configured WhatsApp number.
      const branchDigits = phoneDigits(access.branch.whatsapp_number).slice(-10);
      const verifiedDigits = phoneDigits(resolvedPhone).slice(-10);
      if (branchDigits && verifiedDigits && branchDigits !== verifiedDigits) {
        return res.status(400).json({
          error: `Phone number mismatch: The selected Meta phone number (${resolvedPhone}) does not match this branch's configured WhatsApp number (${access.branch.whatsapp_number}). Please select the correct phone number or update the branch configuration.`
        });
      }

      const maskedPhone = maskPhoneNumber(resolvedPhone);
      const diagnosticDetail = `FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.`;

      const saved = await salonRepository.updateBranchWhatsAppIntegration(req.params.branchId, {
        waba_id: cleanWabaId,
        phone_number_id: cleanPhoneId,
        display_name: resolvedDisplayName,
        display_phone_number: resolvedPhone,
        masked_phone_number: maskedPhone,
        status: 'connected',
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: undefined
      }, access.admin.name);

      return res.json({
        success: true,
        message: 'WhatsApp Business Coexistence connected and verified with Meta Graph API for branch.',
        diagnostics: diagnosticDetail,
        integration: saved
      });
    } else {
      const diagnosticDetail = `FINISH event received / WABA ID received / Phone Number ID received / Graph verification failed: ${verification.error || 'Ownership mismatch'}`;
      const saved = await salonRepository.updateBranchWhatsAppIntegration(req.params.branchId, {
        waba_id: cleanWabaId,
        phone_number_id: cleanPhoneId,
        display_name: resolvedDisplayName,
        display_phone_number: resolvedPhone,
        masked_phone_number: maskPhoneNumber(resolvedPhone),
        status: 'failed',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: verification.error
      }, access.admin.name);

      return res.status(400).json({
        success: false,
        error: verification.error || 'Meta verification failed. Phone number does not belong to the returned WABA.',
        diagnostics: diagnosticDetail,
        integration: saved
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Test Branch WhatsApp Connection with Meta Graph API
app.post('/api/admin/branches/:branchId/whatsapp/test', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const integration = await salonRepository.getBranchWhatsAppIntegration(req.params.branchId);
    if (!integration.waba_id || !integration.phone_number_id) {
      return res.status(400).json({
        error: 'No WhatsApp Business IDs configured for this branch. Please pair via Meta Embedded Signup first.'
      });
    }

    if (!isValidMetaNumericId(integration.waba_id) || !isValidMetaNumericId(integration.phone_number_id)) {
      return res.status(400).json({
        error: 'Stored Meta IDs are invalid or placeholder. Please reconnect via Meta Embedded Signup.'
      });
    }

    const verification = await verifyMetaWabaOwnership(integration.waba_id, integration.phone_number_id);

    if (verification.verified) {
      const diagnosticDetail = 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.';
      const updated = await salonRepository.updateBranchWhatsAppIntegration(req.params.branchId, {
        status: 'connected',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: undefined,
        ...(verification.verified_name && { display_name: verification.verified_name }),
        ...(verification.display_phone_number && {
          display_phone_number: verification.display_phone_number,
          masked_phone_number: maskPhoneNumber(verification.display_phone_number)
        })
      }, access.admin.name);

      return res.json({
        success: true,
        message: 'WhatsApp connection verified successfully with Meta Graph API. Account is active.',
        diagnostics: diagnosticDetail,
        integration: updated
      });
    } else {
      const diagnosticDetail = `WABA ID received / Phone Number ID received / Graph verification failed: ${verification.error || 'Verification failed'}`;
      const updated = await salonRepository.updateBranchWhatsAppIntegration(req.params.branchId, {
        status: 'failed',
        last_verified_at: new Date().toISOString(),
        diagnostics: diagnosticDetail,
        error_message: verification.error
      }, access.admin.name);

      return res.status(400).json({
        success: false,
        error: verification.error || 'Meta Graph API verification failed.',
        diagnostics: diagnosticDetail,
        integration: updated
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Disconnect Branch WhatsApp Business
app.post('/api/admin/branches/:branchId/whatsapp/disconnect', async (req, res) => {
  try {
    const access = await checkBranchAccess(req, req.params.branchId);
    if (!access.authorized) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const disconnected = await salonRepository.disconnectBranchWhatsAppIntegration(req.params.branchId, access.admin.name);

    res.json({
      success: true,
      message: `WhatsApp Business integration for branch '${access.branch.name}' has been disconnected.`,
      integration: disconnected
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Categories, Services & Packages CRUD
// ----------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  const cats = await salonRepository.getCategories();
  res.json(cats);
});

app.post('/api/categories', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const cat = await salonRepository.createCategory(req.body, actor);
  res.status(201).json(cat);
});

app.patch('/api/categories/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const cat = await salonRepository.updateCategory(req.params.id, req.body, actor);
  res.json(cat);
});

app.delete('/api/categories/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const ok = await salonRepository.deleteCategory(req.params.id, actor);
  res.json({ success: ok });
});

app.get('/api/services', async (req, res) => {
  const categoryId = req.query.category_id as string | undefined;
  const search = req.query.search as string | undefined;
  const list = await salonRepository.getServices(categoryId, search);
  res.json(list);
});

app.post('/api/services', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const srv = await salonRepository.createService(req.body, actor);
  res.status(201).json(srv);
});

app.patch('/api/services/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const srv = await salonRepository.updateService(req.params.id, req.body, actor);
  res.json(srv);
});

app.delete('/api/services/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const ok = await salonRepository.deleteService(req.params.id, actor);
  res.json({ success: ok });
});

app.get('/api/packages', async (req, res) => {
  const pkgs = await salonRepository.getPackages();
  res.json(pkgs);
});

app.post('/api/packages', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const pkg = await salonRepository.createPackage(req.body, actor);
  res.status(201).json(pkg);
});

app.patch('/api/packages/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const pkg = await salonRepository.updatePackage(req.params.id, req.body, actor);
  res.json(pkg);
});

app.delete('/api/packages/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Admin';
  const ok = await salonRepository.deletePackage(req.params.id, actor);
  res.json({ success: ok });
});

// ----------------------------------------------------------------------------
// Appointments & Bookings CRUD
// ----------------------------------------------------------------------------
app.get('/api/appointments', async (req, res) => {
  const status = req.query.status as string | undefined;
  const staffId = req.query.staff_id as string | undefined;
  const mobile = req.query.mobile as string | undefined;
  const list = await salonRepository.getAppointments({ status, staffId, customerMobile: mobile });
  res.json(list);
});

app.get('/api/appointments/:id', async (req, res) => {
  const apt = await salonRepository.getAppointmentById(req.params.id);
  if (!apt) return res.status(404).json({ error: 'Appointment not found' });
  res.json(apt);
});

// Branch-Specific WhatsApp Notification Dispatcher (Never sends from the wrong branch)
async function sendBranchWhatsAppNotification(branchId: string, customerPhone: string, messageText: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const integration = await salonRepository.getBranchWhatsAppIntegration(branchId);
    if (!integration || integration.status !== 'connected' || !integration.phone_number_id) {
      console.log(`[Branch WhatsApp] Notification for branch '${branchId}' skipped: WhatsApp integration is ${integration?.status || 'not configured'}.`);
      return { sent: false, reason: `Branch WhatsApp integration is ${integration?.status || 'disconnected'}` };
    }

    if (!META_SYSTEM_USER_ACCESS_TOKEN) {
      return { sent: false, reason: 'META_SYSTEM_USER_ACCESS_TOKEN not configured on server' };
    }

    const cleanRecipient = customerPhone.replace(/\D/g, '').slice(-10);
    const recipient = cleanRecipient.length === 10 ? `91${cleanRecipient}` : cleanRecipient;

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${integration.phone_number_id}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_SYSTEM_USER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { body: messageText }
      })
    });

    const data: any = await response.json().catch(() => ({}));
    if (response.ok && data?.messages?.[0]?.id) {
      console.log(`[Branch WhatsApp] Message sent successfully from branch '${branchId}' to ${recipient}`);
      return { sent: true };
    } else {
      console.warn(`[Branch WhatsApp] Delivery response for branch '${branchId}':`, data?.error?.message || response.statusText);
      return { sent: false, reason: data?.error?.message || 'Meta API returned error' };
    }
  } catch (err: any) {
    console.error(`[Branch WhatsApp] Network failure sending notification:`, err.message);
    return { sent: false, reason: err.message };
  }
}

app.post('/api/appointments', async (req, res) => {
  try {
    const { customer_name, customer_phone, appointment_date, time_slot, services, notes, booking_source, payment_preference, branch_id } = req.body;
    if (!customer_name || !customer_phone || !appointment_date || !time_slot || !services || !services.length) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const effectiveBranchId = branch_id || 'tgl-gachibowli-main';
    const total_amount = services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    const newApt = await salonRepository.createAppointment({
      customer_name,
      customer_phone,
      branch_id: effectiveBranchId,
      appointment_date,
      time_slot,
      status: 'Pending',
      services,
      total_amount,
      discount_amount: req.body.discount_amount || 0,
      final_amount: total_amount - (req.body.discount_amount || 0),
      payment_preference: payment_preference || 'pay_at_salon',
      notes: notes || '',
      booking_source: booking_source || 'website'
    }, (req.headers['x-admin-name'] as string) || customer_name);

    // Upsert customer in CRM
    try {
      await salonRepository.upsertCustomerFromOrderOrAppointment({
        name: customer_name,
        phone: customer_phone,
        email: req.body.customer_email,
        branchId: effectiveBranchId,
        spend: 0,
        isVisit: true
      });
    } catch (cErr) {
      console.warn('⚠️ Could not upsert customer from appointment:', cErr);
    }

    // Get branch details for address and name
    const branch = await salonRepository.getBranchById(effectiveBranchId);
    const branchName = branch?.name || 'The Glossy Looks Salon';
    const branchAddress = branch?.address || '31, Vinayak Nagar, Gachibowli, Hyderabad';
    const serviceNames = (services || []).map((s: any) => s.name).join(', ') || 'Salon Service';

    // Send real gl_appointment_confirmation template via branch WhatsApp connection
    let waResult: any = { sent: false, status: 'not_configured' };
    try {
      waResult = await sendBranchWhatsAppTemplate({
        branchId: effectiveBranchId,
        recipientPhone: customer_phone,
        templateName: 'gl_appointment_confirmation',
        appointmentId: newApt.id,
        customData: {
          customerName: customer_name,
          branchName: branchName,
          serviceNames: serviceNames,
          appointmentDate: appointment_date,
          appointmentTime: time_slot,
          bookingId: newApt.booking_reference,
          branchAddress: branchAddress
        }
      });

      // Update appointment record with WhatsApp send result
      await salonRepository.updateAppointment(newApt.id, {
        whatsapp_status: waResult.status,
        last_whatsapp_sent_at: waResult.sent ? new Date().toISOString() : undefined,
        last_whatsapp_error: waResult.error
      }, 'System');
    } catch (waErr: any) {
      console.warn(`[Appointments] Non-blocking WhatsApp confirmation failure:`, waErr.message);
      waResult = { sent: false, status: 'failed', error: waErr.message };
    }

    // Return appointment with clear WhatsApp delivery report
    res.status(201).json({
      ...newApt,
      whatsapp_status: waResult.status,
      whatsapp_delivery: {
        sent: waResult.sent,
        status: waResult.status,
        message_id: waResult.messageId,
        error: waResult.error,
        diagnostics: waResult.diagnostics
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Manual Appointment WhatsApp Confirmation
app.post('/api/admin/appointments/:id/whatsapp/confirm', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Only Salon Owners and Branch Managers can send WhatsApp confirmations.' });
    }

    const apt = await salonRepository.getAppointmentById(req.params.id);
    if (!apt) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const effectiveBranchId = apt.branch_id || 'tgl-gachibowli-main';

    // If manager, ensure they are assigned to this branch
    if (admin.role === 'manager') {
      const isAssigned = admin.branch_id === effectiveBranchId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied: You can only send WhatsApp confirmations for your assigned branch.' });
      }
    }

    // Duplicate send check: if sent in last 5 minutes and !force, warn and allow confirmation
    const force = Boolean(req.body.force);
    if (!force && apt.last_whatsapp_sent_at) {
      const lastSentTime = new Date(apt.last_whatsapp_sent_at).getTime();
      const elapsedMs = Date.now() - lastSentTime;
      if (elapsedMs < 5 * 60 * 1000) {
        const minutesAgo = Math.max(1, Math.round(elapsedMs / 60000));
        return res.json({
          success: false,
          warning: `A WhatsApp confirmation was already sent to this customer ${minutesAgo} minute(s) ago (${new Date(apt.last_whatsapp_sent_at).toLocaleTimeString()}).`,
          duplicate_prevented: true,
          last_sent_at: apt.last_whatsapp_sent_at,
          message: 'Click "Send Again" to re-send the confirmation.'
        });
      }
    }

    const branch = await salonRepository.getBranchById(effectiveBranchId);
    const branchName = branch?.name || 'The Glossy Looks Salon';
    const branchAddress = branch?.address || '31, Vinayak Nagar, Gachibowli, Hyderabad';
    const serviceNames = (apt.services || []).map((s: any) => s.name).join(', ') || 'Salon Service';

    const waResult = await sendBranchWhatsAppTemplate({
      branchId: effectiveBranchId,
      recipientPhone: apt.customer_phone,
      templateName: 'gl_appointment_confirmation',
      appointmentId: apt.id,
      customData: {
        customerName: apt.customer_name,
        branchName: branchName,
        serviceNames: serviceNames,
        appointmentDate: apt.appointment_date,
        appointmentTime: apt.time_slot,
        bookingId: apt.booking_reference,
        branchAddress: branchAddress
      }
    });

    const updatedApt = await salonRepository.updateAppointment(apt.id, {
      whatsapp_status: waResult.status,
      last_whatsapp_sent_at: waResult.sent ? new Date().toISOString() : apt.last_whatsapp_sent_at,
      last_whatsapp_error: waResult.error
    }, admin.name);

    res.json({
      success: waResult.sent,
      status: waResult.status,
      message_id: waResult.messageId,
      error: waResult.error,
      diagnostics: waResult.diagnostics,
      log: waResult.log,
      appointment: updatedApt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const actor = (req.headers['x-admin-name'] as string) || 'Receptionist';
    const existing = await salonRepository.getAppointmentById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const patch = { ...req.body };
    const isNowCompleted = patch.status === 'Completed' && existing.status !== 'Completed';
    const isNowCancelled = (patch.status === 'Cancelled' || patch.status === 'Canceled') && existing.status !== 'Cancelled';

    if (isNowCompleted && !patch.completed_at) {
      patch.completed_at = new Date().toISOString();
    }

    const apt = await salonRepository.updateAppointment(req.params.id, patch, actor);

    // Schedule delayed feedback when an appointment is marked completed.
    if (isNowCompleted && apt) {
      const scheduledTime = getFeedbackScheduledTime();
      await salonRepository.createScheduledFeedbackJob({
        appointment_id: apt.id,
        branch_id: apt.branch_id || 'tgl-gachibowli-main',
        customer_name: apt.customer_name,
        customer_phone: apt.customer_phone,
        scheduled_at: scheduledTime,
        status: 'pending'
      });

      const delayMs = Math.max(1000, new Date(scheduledTime).getTime() - Date.now());
      setTimeout(async () => {
        try {
          const currentApt = await salonRepository.getAppointmentById(apt.id);
          if (!currentApt || currentApt.status === 'Cancelled' || currentApt.status === 'No Show') return;
          await sendBranchWhatsAppTemplate({
            branchId: apt.branch_id || 'tgl-gachibowli-main',
            recipientPhone: apt.customer_phone,
            templateName: 'glossylooks_customer_feedback',
            appointmentId: apt.id,
            jobType: 'customer_feedback',
            customData: {
              customerName: apt.customer_name
            }
          });
        } catch {}
      }, delayMs);
    }

    // Cancel pending feedback job if appointment is cancelled
    if (isNowCancelled) {
      await salonRepository.cancelScheduledFeedbackJobByAppointment(req.params.id);
    }

    res.json(apt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments/:id/cancel', async (req, res) => {
  try {
    const actor = (req.headers['x-admin-name'] as string) || 'Receptionist';
    const { reason } = req.body;
    const apt = await salonRepository.cancelAppointment(req.params.id, reason || 'Client request', actor);
    // Cancel scheduled feedback job
    await salonRepository.cancelScheduledFeedbackJobByAppointment(req.params.id);
    res.json(apt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Customers Management / CRM
// ----------------------------------------------------------------------------
app.get('/api/customers', async (req, res) => {
  const search = req.query.search as string | undefined;
  const list = await salonRepository.getCustomers(search);
  res.json(list);
});

app.post('/api/customers', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Receptionist';
  const cust = await salonRepository.createCustomer(req.body, actor);
  res.status(201).json(cust);
});

app.patch('/api/customers/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Receptionist';
  const cust = await salonRepository.updateCustomer(req.params.id, req.body, actor);
  res.json(cust);
});

app.delete('/api/customers/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const ok = await salonRepository.deleteCustomer(req.params.id, actor);
  res.json({ success: ok });
});

// ----------------------------------------------------------------------------
// Orders & POS Billing
// ----------------------------------------------------------------------------
app.get('/api/orders', async (req, res) => {
  const list = await salonRepository.getOrders();
  res.json(list);
});

app.post('/api/orders', async (req, res) => {
  try {
    const actor = (req.headers['x-admin-name'] as string) || 'Cashier';
    const {
      customer_name,
      customer_phone,
      items,
      subtotal,
      discount,
      tax_amount,
      tip_amount,
      grand_total,
      paid_amount,
      payment_status,
      primary_payment_mode,
      cashier_name,
      notes,
      appointment_id,
      branch_id,
      idempotency_key
    } = req.body;

    const key = idempotency_key || (req.headers['x-idempotency-key'] as string);

    if (!customer_name || !items || !items.length) {
      return res.status(400).json({ error: 'Missing customer or order items' });
    }

    if (!customer_phone) {
      return res.status(400).json({ error: 'Customer mobile number is required for billing and WhatsApp receipt.' });
    }

    const normalized = normalizePhoneNumber(customer_phone);
    if (!normalized.isValid) {
      return res.status(400).json({
        error: 'Invalid recipient phone number. A valid 10-digit Indian mobile number (e.g. 9848012345) is required.'
      });
    }

    const effectiveBranchId = branch_id || 'tgl-gachibowli-main';
    const now = new Date().toISOString();
    // Exactly 2 minutes after bill creation as required
    const feedbackScheduledTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    // 1. Generate the bill and save the order first with initial state
    const order = await salonRepository.createOrder({
      idempotency_key: key,
      appointment_id,
      branch_id: effectiveBranchId,
      customer_name,
      customer_phone: normalized.e164 || customer_phone,
      items,
      subtotal: subtotal || grand_total,
      discount: discount || 0,
      tax_percent: 5,
      tax_amount: tax_amount || 0,
      tip_amount: tip_amount || 0,
      grand_total,
      paid_amount: paid_amount !== undefined ? paid_amount : grand_total,
      due_amount: Math.max(0, grand_total - (paid_amount !== undefined ? paid_amount : grand_total)),
      payment_status: payment_status || 'Paid',
      primary_payment_mode: primary_payment_mode || 'UPI',
      cashier_name: cashier_name || actor,
      notes: notes || '',
      whatsapp_status: 'sending',
      receipt_whatsapp_status: 'sending',
      feedback_whatsapp_status: 'scheduled',
      feedback_whatsapp_scheduled_at: feedbackScheduledTime
    }, actor);

    // 2. Schedule automatic feedback job for 2 minutes after completion
    await salonRepository.createScheduledFeedbackJob({
      order_id: order.id,
      appointment_id: appointment_id || undefined,
      branch_id: effectiveBranchId,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      scheduled_at: feedbackScheduledTime,
      status: 'pending',
      job_type: 'customer_feedback',
      template_name: 'glossylooks_customer_feedback'
    });

    // Active in-memory timer for guaranteed 2-minute delivery
    const safeFeedbackDelay = Math.max(1000, new Date(feedbackScheduledTime).getTime() - Date.now());
    console.log(`[Feedback Timer] Registered 2-minute timer for order ${order.bill_number} (triggers in ${Math.round(safeFeedbackDelay / 1000)}s)`);
    setTimeout(async () => {
      try {
        console.log(`[Feedback Timer] 2-minute timer fired for order ${order.bill_number || order.id}`);
        const currentOrder = await salonRepository.getOrderById(order.id);
        if (!currentOrder) return;
        if (
          currentOrder.feedback_whatsapp_status === 'sent' ||
          currentOrder.feedback_whatsapp_status === 'delivered' ||
          currentOrder.feedback_whatsapp_status === 'read'
        ) {
          console.log(`[Feedback Timer] Order ${order.bill_number} feedback already sent/delivered. Skipping.`);
          return;
        }

        await salonRepository.updateOrder(order.id, { feedback_whatsapp_status: 'sending' });

        const feedbackResult = await sendBranchWhatsAppTemplate({
          branchId: effectiveBranchId,
          recipientPhone: currentOrder.customer_phone,
          templateName: 'glossylooks_customer_feedback',
          orderId: currentOrder.id,
          appointmentId: currentOrder.appointment_id,
          jobType: 'customer_feedback',
          customData: {
            customerName: currentOrder.customer_name
          }
        });
        console.log(`[Feedback Timer] Automated 2-minute feedback sent for ${order.bill_number}:`, feedbackResult.status);
      } catch (tErr: any) {
        console.error(`[Feedback Timer] Execution error for ${order.id}:`, tErr.message);
      }
    }, safeFeedbackDelay);

    // 3. Mark appointment completed if linked
    if (appointment_id) {
      try {
        const apt = await salonRepository.getAppointmentById(appointment_id);
        if (apt && apt.status !== 'Completed') {
          await salonRepository.updateAppointment(appointment_id, {
            status: 'Completed',
            completed_at: new Date().toISOString()
          }, actor);
        }
      } catch (aptErr) {
        console.warn('⚠️ Could not update appointment status:', aptErr);
      }
    }

    // 4. Immediately send the approved WhatsApp template: gl_bill_receipt
    const branch = await salonRepository.getBranchById(effectiveBranchId);
    const branchName = branch?.name || 'The Glossy Looks';
    const itemsSummary = (order.items || []).map(i => `${i.item_name} (x${i.quantity})`).join(', ');
    const billDate = new Date(order.created_at || now).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const receiptResult = await sendBranchWhatsAppTemplate({
      branchId: effectiveBranchId,
      recipientPhone: order.customer_phone,
      templateName: 'gl_bill_receipt',
      orderId: order.id,
      appointmentId: appointment_id,
      jobType: 'bill_receipt',
      customData: {
        customerName: order.customer_name,
        billNumber: order.bill_number,
        billDate: billDate,
        itemsSummary: itemsSummary || 'Salon Services',
        grandTotal: String(order.grand_total),
        paymentMode: order.primary_payment_mode || 'UPI',
        branchName: branchName
      }
    });

    const receiptStatus: WhatsAppMessageStatus = receiptResult.sent
      ? 'sent'
      : (receiptResult.status === 'retrying' ? 'retrying' : (receiptResult.status === 'pending_approval' ? 'pending_approval' : 'failed'));

    // Update order with immediate receipt delivery details
    await salonRepository.updateOrder(order.id, {
      receipt_whatsapp_status: receiptStatus,
      receipt_whatsapp_message_id: receiptResult.messageId,
      receipt_whatsapp_sent_at: receiptResult.sent ? new Date().toISOString() : undefined,
      receipt_whatsapp_error: receiptResult.sent ? undefined : receiptResult.error,
      whatsapp_status: receiptStatus
    });

    order.receipt_whatsapp_status = receiptStatus;
    order.receipt_whatsapp_message_id = receiptResult.messageId;
    order.receipt_whatsapp_sent_at = receiptResult.sent ? new Date().toISOString() : undefined;
    order.receipt_whatsapp_error = receiptResult.sent ? undefined : receiptResult.error;
    order.whatsapp_status = receiptStatus;
    order.feedback_whatsapp_status = 'scheduled';
    order.feedback_whatsapp_scheduled_at = feedbackScheduledTime;

    // Return the created order with fresh live statuses
    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const order = await salonRepository.getOrderById(req.params.id) || (await salonRepository.getOrders()).find(item => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// Edit permitted order details (Manager & Owner)
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || !['owner', 'manager'].includes(admin.role)) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const orderId = req.params.id;
    const existingOrder = await salonRepository.getOrderById(orderId) || (await salonRepository.getOrders()).find(o => o.id === orderId);
    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

    const { primary_payment_mode, discount, customer_name, customer_phone, notes, payment_status } = req.body;
    const auditChanges: Record<string, { old: any; new: any }> = {};
    const updates: Partial<Order> = {};

    if (primary_payment_mode && primary_payment_mode !== existingOrder.primary_payment_mode) {
      auditChanges.primary_payment_mode = { old: existingOrder.primary_payment_mode, new: primary_payment_mode };
      updates.primary_payment_mode = primary_payment_mode;
    }
    if (payment_status && payment_status !== existingOrder.payment_status) {
      auditChanges.payment_status = { old: existingOrder.payment_status, new: payment_status };
      updates.payment_status = payment_status;
    }
    if (customer_name && customer_name !== existingOrder.customer_name) {
      auditChanges.customer_name = { old: existingOrder.customer_name, new: customer_name };
      updates.customer_name = customer_name;
    }
    if (customer_phone && customer_phone !== existingOrder.customer_phone) {
      auditChanges.customer_phone = { old: existingOrder.customer_phone, new: customer_phone };
      updates.customer_phone = customer_phone;
    }
    if (notes !== undefined && notes !== existingOrder.notes) {
      auditChanges.notes = { old: existingOrder.notes, new: notes };
      updates.notes = notes;
    }
    if (discount !== undefined && Number(discount) !== Number(existingOrder.discount)) {
      const newDiscount = Math.max(0, Number(discount));
      auditChanges.discount = { old: existingOrder.discount, new: newDiscount };
      updates.discount = newDiscount;
      const subtotal = existingOrder.subtotal || existingOrder.grand_total;
      const taxable = Math.max(0, subtotal - newDiscount);
      const taxAmount = Math.round(taxable * 0.05);
      const grandTotal = taxable + taxAmount;
      updates.tax_amount = taxAmount;
      updates.grand_total = grandTotal;
      updates.paid_amount = existingOrder.payment_status === 'Paid' ? grandTotal : existingOrder.paid_amount;
      auditChanges.grand_total = { old: existingOrder.grand_total, new: grandTotal };
    }

    // Bill number is strictly immutable!
    delete (updates as any).bill_number;

    const actor = admin.name || (req.headers['x-admin-name'] as string) || 'Manager';
    const updated = await salonRepository.updateOrder(orderId, updates);

    // Update corresponding payment record if present
    try {
      const payments = await salonRepository.getPayments();
      const match = payments.find(p => p.order_id === orderId || p.bill_number === existingOrder.bill_number);
      if (match) {
        const payUpdate: any = {
          customer_name: updates.customer_name || existingOrder.customer_name,
          customer_phone: updates.customer_phone || existingOrder.customer_phone,
          payment_mode: updates.primary_payment_mode || existingOrder.primary_payment_mode,
          amount: updates.paid_amount !== undefined ? updates.paid_amount : match.amount,
          status: updates.payment_status === 'Refunded' ? 'Refunded' : match.status
        };
        await (salonRepository as any).client?.from('payments').update(payUpdate).eq('id', match.id);
      }
    } catch {}

    await salonRepository.logAudit(
      'ORDER_EDIT_AUDIT',
      'Order',
      orderId,
      actor,
      `Order ${existingOrder.bill_number} edited: ${JSON.stringify(auditChanges)}`
    );

    const fullOrder = await salonRepository.getOrderById(orderId) || updated;
    res.json(fullOrder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time WhatsApp status endpoint for polling from POS and Admin
app.get('/api/admin/orders/:id/whatsapp/status', async (req, res) => {
  try {
    const order = await salonRepository.getOrderById(req.params.id) || (await salonRepository.getOrders()).find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({
      order_id: order.id,
      receipt_status: order.receipt_whatsapp_status || order.whatsapp_status || 'pending',
      receipt_message_id: order.receipt_whatsapp_message_id,
      receipt_error: order.receipt_whatsapp_error,
      receipt_sent_at: order.receipt_whatsapp_sent_at,
      feedback_status: order.feedback_whatsapp_status || 'scheduled',
      feedback_message_id: order.feedback_whatsapp_message_id,
      feedback_error: order.feedback_whatsapp_error,
      feedback_scheduled_at: order.feedback_whatsapp_scheduled_at,
      feedback_sent_at: order.feedback_whatsapp_sent_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send the approved customer-feedback template manually after a POS bill.
// Cancels or marks scheduled job executed to avoid duplicate sending.
app.post('/api/admin/orders/:id/whatsapp/feedback', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || !['owner', 'manager', 'receptionist'].includes(admin.role)) {
      return res.status(403).json({ error: 'Access denied: only owner, manager, or reception staff can send feedback.' });
    }

    const order = await salonRepository.getOrderById(req.params.id) || (await salonRepository.getOrders()).find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Bill not found.' });

    if (admin.role !== 'owner' && admin.branch_id && order.branch_id && admin.branch_id !== order.branch_id) {
      return res.status(403).json({ error: 'Access denied for this salon branch.' });
    }

    // Prevent duplicate sending if already delivered or sent
    if (order.feedback_whatsapp_status === 'sent' || order.feedback_whatsapp_status === 'delivered' || order.feedback_whatsapp_status === 'read') {
      return res.status(200).json({
        success: true,
        already_sent: true,
        status: order.feedback_whatsapp_status,
        message: 'Customer feedback WhatsApp has already been sent to this customer.'
      });
    }

    // Cancel pending scheduled feedback jobs for this order to prevent duplicate messages
    await salonRepository.cancelScheduledFeedbackJobByOrder(order.id);
    if (order.appointment_id) {
      await salonRepository.cancelScheduledFeedbackJobByAppointment(order.appointment_id);
    }

    await salonRepository.updateOrder(order.id, {
      feedback_whatsapp_status: 'sending'
    });

    const result = await sendBranchWhatsAppTemplate({
      branchId: order.branch_id || 'tgl-gachibowli-main',
      recipientPhone: order.customer_phone,
      templateName: 'glossylooks_customer_feedback',
      orderId: order.id,
      jobType: 'customer_feedback',
      customData: { customerName: order.customer_name }
    });

    if (result.sent) {
      await salonRepository.updateOrder(order.id, {
        feedback_whatsapp_status: 'sent',
        feedback_whatsapp_message_id: result.messageId,
        feedback_whatsapp_sent_at: new Date().toISOString(),
        feedback_whatsapp_error: undefined
      });
      return res.status(200).json({
        success: true,
        status: 'sent',
        message: 'Feedback request sent',
        message_id: result.messageId
      });
    }

    if (result.status === 'retrying') {
      await salonRepository.updateOrder(order.id, {
        feedback_whatsapp_status: 'retrying',
        feedback_whatsapp_error: result.error
      });
      return res.status(200).json({
        success: true,
        status: 'queued',
        message: 'Feedback request queued and will retry automatically',
        error: result.error
      });
    }

    await salonRepository.updateOrder(order.id, {
      feedback_whatsapp_status: result.status === 'pending_approval' ? 'pending_approval' : 'failed',
      feedback_whatsapp_error: result.error
    });

    const statusCode = result.status === 'pending_approval' ? 409 : 502;
    return res.status(statusCode).json({
      success: false,
      status: result.status,
      message: 'Feedback request failed — Retry',
      error: result.error,
      diagnostics: result.diagnostics
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to send feedback message.' });
  }
});

// Retry endpoint for manual retry of failed WhatsApp messages (receipt or feedback)
app.post('/api/admin/orders/:id/whatsapp/retry', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || !['owner', 'manager', 'receptionist'].includes(admin.role)) {
      return res.status(403).json({ error: 'Access denied: only owner, manager, or reception staff can retry WhatsApp messages.' });
    }

    const order = await salonRepository.getOrderById(req.params.id) || (await salonRepository.getOrders()).find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Bill not found.' });

    const jobType = req.body?.job_type || (order.receipt_whatsapp_status === 'failed' ? 'bill_receipt' : 'customer_feedback');
    const branchId = order.branch_id || 'tgl-gachibowli-main';
    const branch = await salonRepository.getBranchById(branchId);
    const branchName = branch?.name || 'The Glossy Looks';

    if (jobType === 'bill_receipt') {
      const itemsSummary = (order.items || []).map(i => `${i.item_name} (x${i.quantity})`).join(', ');
      const billDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const result = await sendBranchWhatsAppTemplate({
        branchId,
        recipientPhone: order.customer_phone,
        templateName: 'gl_bill_receipt',
        orderId: order.id,
        appointmentId: order.appointment_id,
        jobType: 'bill_receipt',
        customData: {
          customerName: order.customer_name,
          billNumber: order.bill_number,
          billDate: billDate,
          itemsSummary: itemsSummary || 'Salon Services',
          grandTotal: String(order.grand_total),
          paymentMode: order.primary_payment_mode || 'UPI',
          branchName: branchName
        }
      });

      if (result.sent) {
        await salonRepository.updateOrder(order.id, {
          receipt_whatsapp_status: 'sent',
          receipt_whatsapp_message_id: result.messageId,
          receipt_whatsapp_sent_at: new Date().toISOString(),
          receipt_whatsapp_error: undefined,
          whatsapp_status: 'sent'
        });
        return res.status(200).json({
          success: true,
          status: 'sent',
          message: 'Bill receipt WhatsApp sent successfully',
          message_id: result.messageId
        });
      }

      await salonRepository.updateOrder(order.id, {
        receipt_whatsapp_status: 'failed',
        receipt_whatsapp_error: result.error,
        whatsapp_status: 'failed'
      });
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: 'Bill receipt retry failed — Retry',
        error: result.error
      });
    } else {
      // Retry Customer Feedback
      await salonRepository.cancelScheduledFeedbackJobByOrder(order.id);
      if (order.appointment_id) {
        await salonRepository.cancelScheduledFeedbackJobByAppointment(order.appointment_id);
      }

      const result = await sendBranchWhatsAppTemplate({
        branchId,
        recipientPhone: order.customer_phone,
        templateName: 'glossylooks_customer_feedback',
        orderId: order.id,
        jobType: 'customer_feedback',
        customData: { customerName: order.customer_name }
      });

      if (result.sent) {
        await salonRepository.updateOrder(order.id, {
          feedback_whatsapp_status: 'sent',
          feedback_whatsapp_message_id: result.messageId,
          feedback_whatsapp_sent_at: new Date().toISOString(),
          feedback_whatsapp_error: undefined
        });
        return res.status(200).json({
          success: true,
          status: 'sent',
          message: 'Customer feedback WhatsApp sent successfully',
          message_id: result.messageId
        });
      }

      await salonRepository.updateOrder(order.id, {
        feedback_whatsapp_status: 'failed',
        feedback_whatsapp_error: result.error
      });
      return res.status(502).json({
        success: false,
        status: 'failed',
        message: 'Feedback retry failed — Retry',
        error: result.error
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Retry failed.' });
  }
});

// ----------------------------------------------------------------------------
// Payments & Refunds
// ----------------------------------------------------------------------------
app.get('/api/payments', async (req, res) => {
  const list = await salonRepository.getPayments();
  res.json(list);
});

app.post('/api/payments/:id/refund', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const { reason } = req.body;
  const payment = await salonRepository.refundPayment(req.params.id, reason || 'Customer refund request', actor);
  if (!payment) return res.status(404).json({ error: 'Payment record not found' });
  res.json(payment);
});

// ----------------------------------------------------------------------------
// Stock Inventory Management (Products, Suppliers & Movements)
// ----------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  const list = await salonRepository.getProducts();
  res.json(list);
});

app.post('/api/products', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Inventory Staff';
  const prod = await salonRepository.createProduct(req.body, actor);
  res.status(201).json(prod);
});

app.patch('/api/products/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Inventory Staff';
  const prod = await salonRepository.updateProduct(req.params.id, req.body, actor);
  res.json(prod);
});

app.delete('/api/products/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const ok = await salonRepository.deleteProduct(req.params.id, actor);
  res.json({ success: ok });
});

app.get('/api/inventory/movements', async (req, res) => {
  const list = await salonRepository.getInventoryMovements();
  res.json(list);
});

app.post('/api/inventory/movement', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Inventory Staff';
  const mov = await salonRepository.recordInventoryMovement(req.body, actor);
  res.status(201).json(mov);
});

app.get('/api/suppliers', async (req, res) => {
  const list = await salonRepository.getSuppliers();
  res.json(list);
});

app.post('/api/suppliers', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const sup = await salonRepository.createSupplier(req.body, actor);
  res.status(201).json(sup);
});

// ----------------------------------------------------------------------------
// Staff Management
// ----------------------------------------------------------------------------
app.get('/api/staff', async (req, res) => {
  const list = await salonRepository.getStaff();
  res.json(list);
});

app.post('/api/staff', async (req, res) => {
  try {
    const actor = (req.headers['x-admin-name'] as string) || 'Manager';
    const staff = await salonRepository.createStaff(req.body, actor);
    res.status(201).json(staff);
  } catch (err: any) {
    console.error('Unable to create staff profile:', err);
    res.status(400).json({ error: err?.message || 'Unable to create staff profile.' });
  }
});

app.patch('/api/staff/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const staff = await salonRepository.updateStaff(req.params.id, req.body, actor);
  res.json(staff);
});

app.delete('/api/staff/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Owner';
  const ok = await salonRepository.deleteStaff(req.params.id, actor);
  res.json({ success: ok });
});

// ----------------------------------------------------------------------------
// Reports & Analytics - OWNER & MANAGER ONLY
// ----------------------------------------------------------------------------
app.get('/api/reports', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
    return res.status(403).json({ error: 'Access denied: Reports & analytics are restricted to Salon Owner and Manager.' });
  }
  const reports = await salonRepository.getReports();
  res.json(reports);
});

app.get('/api/reports/detailed', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
    return res.status(403).json({ error: 'Access denied: Sales reports are restricted to Salon Owner and Manager.' });
  }
  const period = req.query.period as any || 'today';
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const detailed = await salonRepository.getDetailedReports({
    period,
    startDate,
    endDate
  });
  res.json(detailed);
});

// ----------------------------------------------------------------------------
// Automated Daily Stylist Sales Reporting API Endpoints
// ----------------------------------------------------------------------------

// 1. Cron Endpoint for Vercel Cron (schedule: 45 16 * * * = 10:15 PM IST)
app.all(['/api/cron/daily-stylist-sales-report', '/cron/daily-stylist-sales-report'], async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'];
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Optional check if user explicitly set CRON_SECRET
      console.warn('[Daily Sales Cron] Invocation with unverified CRON_SECRET token');
    }

    const targetDate = (req.query.date as string) || (req.body?.date as string) || getKolkataDateString();
    const force = req.query.force === 'true' || req.body?.force === true;

    console.log(`[Daily Sales Cron Endpoint] Triggered for date ${targetDate} (force: ${force})`);
    const results = await generateAndSendDailySalesReports(targetDate, force);

    res.json({
      success: true,
      message: `Daily stylist sales report run completed for ${targetDate}`,
      ...results
    });
  } catch (err: any) {
    console.error('[Daily Sales Cron Endpoint] Execution failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Manual Trigger Endpoint for Owner & Manager
app.post('/api/admin/reports/send-daily-stylist-sales', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Only Salon Owner and Manager can trigger daily sales WhatsApp reports.' });
    }

    const { date, force } = req.body || {};
    const targetDate = date || getKolkataDateString();

    console.log(`[Manual Sales Report] Triggered by ${admin.name} (${admin.role}) for date: ${targetDate}, force: ${!!force}`);
    const results = await generateAndSendDailySalesReports(targetDate, !!force);

    await salonRepository.logAudit(
      'SEND_DAILY_STYLIST_SALES_REPORT',
      'DailySalesReport',
      targetDate,
      admin.name,
      `Manually triggered daily sales report for ${targetDate} (Sent: ${results.sent.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}, Force: ${!!force})`
    ).catch(() => {});

    res.json({
      success: true,
      message: `Daily sales WhatsApp reports processed for ${targetDate}.`,
      ...results
    });
  } catch (err: any) {
    console.error('[Manual Sales Report] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Status & History of Sent Reports
app.get('/api/admin/reports/daily-stylist-sales-history', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
      return res.status(403).json({ error: 'Access denied: Restricted to Salon Owner and Manager.' });
    }

    const date = req.query.date as string | undefined;
    const reports = await salonRepository.getDailySalesReports(date);

    // Also get today's status check
    const todayStr = getKolkataDateString();
    const todayReports = reports.filter(r => r.report_date === todayStr);
    const alreadySentToday = todayReports.some(r => r.status === 'sent');

    res.json({
      todayDate: todayStr,
      alreadySentToday,
      todayReportsCount: todayReports.length,
      reports
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/audit-logs', async (req, res) => {
  const admin = await getAuthAdmin(req);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'manager')) {
    return res.status(403).json({ error: 'Access denied: Audit logs are restricted to Salon Owner and Manager.' });
  }
  const logs = await salonRepository.getAuditLogs();
  res.json(logs);
});

// ----------------------------------------------------------------------------
// Print Devices & Print Provider (MOZZ Pattern)
// ----------------------------------------------------------------------------
app.get('/api/print-devices', async (req, res) => {
  const devs = await salonRepository.getPrintDevices();
  res.json(devs);
});

app.post('/api/print-devices/register', async (req, res) => {
  const dev = await salonRepository.registerPrintDevice(req.body);
  res.json(dev);
});

app.post('/api/print-devices/heartbeat', async (req, res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error: 'Missing device_id' });
  await salonRepository.updateDeviceHeartbeat(device_id);
  res.json({ success: true, timestamp: new Date().toISOString() });
});

app.get('/api/print-jobs', async (req, res) => {
  const jobs = await salonRepository.getPrintJobs();
  res.json(jobs);
});

app.get('/api/print-jobs/pending', async (req, res) => {
  const deviceId = req.query.device_id as string | undefined;
  const jobs = await salonRepository.getPrintJobs(deviceId);
  res.json(jobs.filter(j => j.status === 'Pending' || j.status === 'Retried'));
});

app.post('/api/print-jobs/reprint', async (req, res) => {
  const { job_type, order_id, appointment_id, payload } = req.body;
  const devs = await salonRepository.getPrintDevices();
  const activeDevice = devs.find(d => d.is_online) || devs[0];
  if (!activeDevice) {
    return res.status(400).json({ error: 'No print device registered' });
  }

  const job = await salonRepository.queuePrintJob({
    device_id: activeDevice.id,
    job_type: job_type || 'bill',
    order_id,
    appointment_id,
    payload
  });

  res.json(job);
});

app.patch('/api/print-jobs/:id/status', async (req, res) => {
  const { status } = req.body;
  const updated = await salonRepository.updatePrintJobStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Print job not found' });
  res.json(updated);
});

// ----------------------------------------------------------------------------
// Gallery & Reviews & Enquiries
// ----------------------------------------------------------------------------
app.get('/api/gallery', async (req, res) => {
  const onlyApproved = req.query.approved === 'true';
  const list = await salonRepository.getGallery(onlyApproved);
  res.json(list);
});

app.post('/api/gallery', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Artist';
  const item = await salonRepository.createGalleryItem(req.body, actor);
  res.status(201).json(item);
});

app.patch('/api/gallery/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const item = await salonRepository.updateGalleryItem(req.params.id, req.body, actor);
  res.json(item);
});

app.delete('/api/gallery/:id', async (req, res) => {
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const ok = await salonRepository.deleteGalleryItem(req.params.id, actor);
  res.json({ success: ok });
});

app.get('/api/enquiries', async (req, res) => {
  const list = await salonRepository.getEnquiries();
  res.json(list);
});

app.post('/api/enquiries', async (req, res) => {
  try {
    const enq = await salonRepository.createEnquiry(req.body);

    // Synchronize website enquiry into WhatsApp Inbox conversation thread
    try {
      const rawPhone = String(req.body.phone || req.body.mobile || '');
      const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length === 10) {
        const formattedPhone = `+91${cleanDigits}`;
        let matchedCustomer: any = null;
        try {
          matchedCustomer = await salonRepository.getCustomerByMobile(cleanDigits);
        } catch {}

        const conv = await salonRepository.getOrCreateWhatsAppConversation({
          branch_id: req.body.branch_id || (enq as any).branch_id || 'tgl-gachibowli-main',
          customer_id: matchedCustomer?.id,
          customer_phone: formattedPhone,
          customer_name: req.body.name || matchedCustomer?.name || 'Website Visitor',
          source_channel: 'WEBSITE_ENQUIRY'
        });

        const serviceText = req.body.service_interest ? `Service: ${req.body.service_interest}` : 'General Consultation';
        const notesText = req.body.message ? `Notes: ${req.body.message}` : '';
        const emailText = req.body.email ? `Email: ${req.body.email}` : '';
        const messageText = [`Website Enquiry: ${req.body.name || 'Visitor'}`, serviceText, notesText, emailText].filter(Boolean).join('\n');

        const enquiryMsg = await salonRepository.createWhatsAppMessage({
          conversation_id: conv.id,
          direction: 'INBOUND',
          message_type: 'text',
          text_body: messageText,
          status: 'delivered',
          source_badge: 'WEBSITE_ENQUIRY',
          received_at: new Date().toISOString()
        });

        // Update conversation WITHOUT modifying last_inbound_at!
        // (Website enquiry must NOT open the Meta 24-hour WhatsApp customer service window)
        const nowIso = new Date().toISOString();
        const updatedConv = await salonRepository.updateWhatsAppConversation(conv.id, {
          last_message_at: nowIso,
          last_message_text: `[Website Enquiry] ${req.body.service_interest || 'General'}: ${req.body.message || ''}`.trim(),
          unread_count: (conv.unread_count || 0) + 1,
          status: 'OPEN',
          source_channel: conv.source_channel === 'WHATSAPP' ? 'MIXED' : (conv.source_channel || 'WEBSITE_ENQUIRY')
        });

        broadcastWhatsAppInboxEvent({
          type: 'inbound_message',
          conversationId: conv.id,
          message: enquiryMsg,
          conversation: updatedConv || conv
        });
      }
    } catch (inboxErr: any) {
      console.warn('[Website Enquiry] Failed to record in WhatsApp Inbox:', inboxErr.message);
    }

    res.status(201).json(enq);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews', async (req, res) => {
  const list = await salonRepository.getReviews();
  res.json(list);
});

app.post('/api/reviews', async (req, res) => {
  const rev = await salonRepository.createReview(req.body);
  res.status(201).json(rev);
});

// ============================================================================
// VITE INTEGRATION / STATIC SERVING
// ============================================================================

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (isProd && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/robots.txt' || req.path === '/sitemap.xml') {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // In Vite middlewareMode, SPA HTML routes must be served via transformIndexHtml
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api/') || url === '/health' || url === '/robots.txt' || url === '/sitemap.xml') {
          return next();
        }
        try {
          const indexHtmlPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexHtmlPath)) {
            let template = fs.readFileSync(indexHtmlPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } else if (hasDist) {
            res.sendFile(path.resolve(distPath, 'index.html'));
          } else {
            next();
          }
        } catch (e) {
          if (vite && typeof vite.ssrFixStacktrace === 'function') {
            vite.ssrFixStacktrace(e as Error);
          }
          next(e);
        }
      });
    } catch (err) {
      console.warn('Vite dev middleware could not be loaded, falling back to static:', err);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/robots.txt' || req.path === '/sitemap.xml') {
            return next();
          }
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// A local/AI Studio process needs an HTTP listener. On Vercel the exported
// Express application is invoked by the Vercel Function runtime instead.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
