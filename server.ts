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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

// Safe environment logging (validate optional variables without crashing)
if (process.env.SUPABASE_URL) {
  console.log('ℹ️ Supabase integration enabled with URL:', process.env.SUPABASE_URL);
} else {
  console.log('ℹ️ Supabase not configured: Running with persistent local database repository');
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
// Feedback is deliberately configurable so the salon can use a short test delay
// now and increase it later without changing source code.
const configuredFeedbackDelayMinutes = Number(process.env.FEEDBACK_DELAY_MINUTES || '30');
const FEEDBACK_DELAY_MINUTES = Number.isFinite(configuredFeedbackDelayMinutes) && configuredFeedbackDelayMinutes > 0
  ? Math.floor(configuredFeedbackDelayMinutes)
  : 30;
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

  // 1. Check if token contains user ID: tgl_admin_token_usr-X_...
  if (token && token.startsWith('tgl_admin_token_')) {
    const parts = token.split('_');
    if (parts.length >= 4) {
      const tokenUserId = parts[3];
      const match = users.find(x => x.id === tokenUserId && x.is_active);
      if (match) return match;
    }
  }

  // 2. Check user ID header
  if (userId) {
    const match = users.find(x => (x.id === userId || x.user_id === userId) && x.is_active);
    if (match) return match;
  }

  // 3. Fallback to active role header if present (for backward compatibility)
  if (adminRole) {
    const match = users.find(x => x.role === adminRole && x.is_active);
    if (match) return match;
  }

  // 4. Default to first active owner if a valid token exists
  if (token) {
    return users.find(x => x.role === 'owner' && x.is_active) || users[0] || null;
  }

  return null;
};

// ----------------------------------------------------------------------------
// Admin Authentication & Users Management
// ----------------------------------------------------------------------------
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginTarget = identifier || email;
    if (!loginTarget || !password) {
      return res.status(400).json({ error: 'Please enter your User ID, Email, or Mobile number and Password.' });
    }

    const user = await salonRepository.getUserByIdentifier(loginTarget);
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please verify your User ID, Email, or Mobile number.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This staff account has been deactivated. Please contact the Salon Owner.' });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your password or ask the Salon Owner to reset it.' });
    }

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
app.get(['/api/auth/admin/me', '/api/admin/me'], async (req, res) => {
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
  customData?: {
    customerName?: string;
    branchName?: string;
    serviceNames?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    bookingId?: string;
    branchAddress?: string;
  };
}

async function sendBranchWhatsAppTemplate(options: SendWhatsAppTemplateOptions): Promise<{
  sent: boolean;
  status: 'sent' | 'pending_approval' | 'failed';
  messageId?: string;
  error?: string;
  diagnostics?: string;
  log?: any;
}> {
  const { branchId, recipientPhone, templateName, appointmentId, orderId, customData } = options;
  const integration = await salonRepository.getBranchWhatsAppIntegration(branchId);
  const cleanRecipientDigits = phoneDigits(recipientPhone).slice(-10);

  if (!cleanRecipientDigits || cleanRecipientDigits.length < 10) {
    const errorMsg = 'Invalid recipient phone number. 10-digit mobile number required.';
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      template_name: templateName,
      recipient_number: recipientPhone || 'unknown',
      sender_phone_number_id: integration?.phone_number_id || 'unassigned',
      status: 'failed',
      error_message: errorMsg,
      diagnostics: 'Recipient validation failed'
    });
    return { sent: false, status: 'failed', error: errorMsg, log };
  }

  const recipient = `91${cleanRecipientDigits}`;

  if (!integration || integration.status !== 'connected' || !integration.phone_number_id) {
    const errorMsg = `Branch WhatsApp integration is ${integration?.status || 'disconnected'}. Please connect WhatsApp in Admin Settings.`;
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      template_name: templateName,
      recipient_number: recipient,
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
      template_name: templateName,
      recipient_number: recipient,
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
  } else if (templateName === 'hello_world') {
    resolvedLang = resolvedLang || 'en_US';
    components = [];
  }

  try {
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
        type: 'template',
        template: {
          name: resolvedTemplateName,
          language: { code: resolvedLang },
          ...(components && components.length > 0 ? { components } : {})
        }
      })
    });

    const data: any = await response.json().catch(() => ({}));
    if (response.ok && data?.messages?.[0]?.id) {
      const messageId = data.messages[0].id;
      const sentTime = new Date().toISOString();
      const log = await salonRepository.createWhatsAppMessageLog({
        appointment_id: appointmentId,
        order_id: orderId,
        branch_id: branchId,
        template_name: templateName,
        recipient_number: recipient,
        sender_phone_number_id: integration.phone_number_id,
        meta_message_id: messageId,
        status: 'sent',
        sent_at: sentTime,
        diagnostics: `FINISH event received / WABA ID received / Phone Number ID received / Graph API message queued (Message ID: ${messageId})`
      });
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

    const status = isAppReviewOrSandbox ? 'pending_approval' : 'failed';
    const friendlyError = isAppReviewOrSandbox
      ? 'Pending Meta approval: Live sending is currently restricted by Meta while App Review is in progress. Real messages can only be delivered to verified test/admin phone numbers in Meta App Settings.'
      : `Meta API delivery failed: ${errMsg}`;
    const diagnostic = `Meta Graph API error (Code ${errCode || 'N/A'}): ${errMsg}`;

    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      template_name: templateName,
      recipient_number: recipient,
      sender_phone_number_id: integration.phone_number_id,
      status: status,
      error_message: friendlyError,
      diagnostics: diagnostic
    });

    return {
      sent: false,
      status: status,
      error: friendlyError,
      diagnostics: diagnostic,
      log
    };
  } catch (err: any) {
    const errorMsg = `Network error communicating with Meta Cloud API: ${err.message}`;
    const log = await salonRepository.createWhatsAppMessageLog({
      appointment_id: appointmentId,
      order_id: orderId,
      branch_id: branchId,
      template_name: templateName,
      recipient_number: recipient,
      sender_phone_number_id: integration.phone_number_id,
      status: 'failed',
      error_message: errorMsg,
      diagnostics: `Network failure: ${err.message}`
    });
    return { sent: false, status: 'failed', error: errorMsg, log };
  }
}

async function sendWhatsAppFreeformReply(branchId: string, recipientPhone: string, text: string): Promise<boolean> {
  const integration = await salonRepository.getBranchWhatsAppIntegration(branchId);
  if (!integration || integration.status !== 'connected' || !integration.phone_number_id || !META_SYSTEM_USER_ACCESS_TOKEN) {
    return false;
  }
  const cleanPhone = phoneDigits(recipientPhone).slice(-10);
  const to = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  try {
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${integration.phone_number_id}/messages`, {
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
        text: { body: text }
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Durable Server-Side Scheduled Feedback Job Runner
// ----------------------------------------------------------------------------
async function checkAndRunScheduledFeedbackJobs() {
  try {
    const dueJobs = await salonRepository.getDueScheduledFeedbackJobs();
    if (!dueJobs || !dueJobs.length) return;

    for (const job of dueJobs) {
      console.log(`[Scheduled Feedback] Executing due job ${job.id} for appointment ${job.appointment_id}...`);

      const apt = await salonRepository.getAppointmentById(job.appointment_id);
      if (!apt || apt.status === 'Cancelled' || apt.status === 'No Show') {
        console.log(`[Scheduled Feedback] Appointment ${job.appointment_id} is cancelled/no-show. Skipping feedback.`);
        await salonRepository.updateScheduledFeedbackJob(job.id, { status: 'cancelled' });
        continue;
      }

      if (job.status !== 'pending') continue;

      const result = await sendBranchWhatsAppTemplate({
        branchId: job.branch_id,
        recipientPhone: job.customer_phone,
        templateName: 'the_glossylooks_customer_feedback',
        appointmentId: job.appointment_id,
        customData: {
          customerName: job.customer_name
        }
      });

      if (result.status === 'sent') {
        await salonRepository.updateScheduledFeedbackJob(job.id, {
          status: 'completed',
          meta_message_id: result.messageId,
          attempts: (job.attempts || 0) + 1
        });
      } else {
        await salonRepository.updateScheduledFeedbackJob(job.id, {
          status: 'failed',
          error_message: result.error,
          attempts: (job.attempts || 0) + 1
        });
      }
    }
  } catch (err: any) {
    console.error('[Scheduled Feedback] Runner error:', err.message);
  }
}

// Durable interval runner: checks every 30 seconds
setInterval(() => {
  checkAndRunScheduledFeedbackJobs().catch(() => {});
}, 30000);

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
  // URL verification is a GET request and does not have a signature. POST
  // notifications must be signed when META_APP_SECRET is configured.
  if (!META_APP_SECRET) {
    console.warn('[WhatsApp Webhook] META_APP_SECRET is not configured; refusing unsigned webhook POST.');
    return false;
  }

  const signature = req.header('x-hub-signature-256');
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody || !signature.startsWith('sha256=')) return false;

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
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Respond 200 immediately to acknowledge Meta delivery
  res.status(200).json({ status: 'EVENT_RECEIVED', received: true });

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const val = change.value;
        if (!val) continue;

        // 1. Process Delivery Statuses (sent -> delivered -> read)
        if (Array.isArray(val.statuses)) {
          for (const st of val.statuses) {
            const metaId = st.id;
            const statusStr = st.status;
            const timestamp = st.timestamp ? new Date(Number(st.timestamp) * 1000).toISOString() : new Date().toISOString();

            if (statusStr === 'delivered') {
              await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'delivered',
                delivered_at: timestamp
              });
            } else if (statusStr === 'read') {
              await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'read',
                read_at: timestamp
              });
            } else if (statusStr === 'failed') {
              const errDetail = Array.isArray(st.errors) && st.errors[0]?.message ? st.errors[0].message : 'Meta webhook reported failure';
              await salonRepository.updateWhatsAppMessageLogByMetaId(metaId, {
                status: 'failed',
                error_message: errDetail
              });
            }
          }
        }

        // 2. Process Incoming Customer Messages & Feedback Replies
        if (Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            if (await salonRepository.isWebhookEventProcessed(msg.id)) {
              continue;
            }
            await salonRepository.recordProcessedWebhookEvent(msg.id, 'whatsapp_incoming_message');

            const fromPhone = String(msg.from || '').replace(/\D/g, '').slice(-10);
            if (!fromPhone) continue;

            let text = '';
            if (msg.type === 'button') {
              text = msg.button?.text || msg.button?.payload || '';
            } else if (msg.type === 'interactive') {
              text = msg.interactive?.button_reply?.title || msg.interactive?.button_reply?.id || '';
            } else if (msg.type === 'text') {
              text = msg.text?.body || '';
            }

            const cleanText = text.trim().toLowerCase();
            let rating: 'good' | 'average' | 'bad' | null = null;
            if (cleanText === 'good' || cleanText.includes('good') || cleanText === 'great' || cleanText === 'excellent' || cleanText === '5') {
              rating = 'good';
            } else if (cleanText === 'average' || cleanText.includes('average') || cleanText === 'ok' || cleanText === 'okay' || cleanText === '3') {
              rating = 'average';
            } else if (cleanText === 'bad' || cleanText.includes('bad') || cleanText === 'poor' || cleanText === 'unhappy' || cleanText === '1' || cleanText === '2') {
              rating = 'bad';
            }

            if (!rating) continue;

            const allApts = await salonRepository.getAppointments({ customerMobile: fromPhone });
            const apt = allApts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const appointmentId = apt ? apt.id : `apt-${fromPhone}`;
            const branchId = apt?.branch_id || 'tgl-gachibowli-main';
            const customerName = apt?.customer_name || 'Valued Customer';

            const existingFeedbacks = await salonRepository.getAppointmentFeedback();
            const alreadyRecorded = existingFeedbacks.some(f => f.appointment_id === appointmentId);
            if (alreadyRecorded) {
              await salonRepository.logAudit(
                'FEEDBACK_DUPLICATE_IGNORED',
                'Feedback',
                appointmentId,
                `Customer ${fromPhone}`,
                `Duplicate reply received from ${fromPhone}: "${text}". First response retained.`
              );
              continue;
            }

            await salonRepository.createAppointmentFeedback({
              appointment_id: appointmentId,
              branch_id: branchId,
              customer_name: customerName,
              customer_phone: fromPhone,
              rating: rating,
              reply_text: text,
              meta_message_id: msg.id,
              is_read: false
            });

            let autoReplyText = '';
            if (rating === 'good') {
              autoReplyText = "Thank you for choosing The Glossy Looks. We’re delighted you had a great experience. Your review means a lot to us: https://g.page/r/CTx5NddxkeKaEAE/review";
            } else if (rating === 'average') {
              autoReplyText = "Thank you for your feedback. We’re sorry that your experience was not perfect. Our team will work to improve and serve you better on your next visit.";
            } else if (rating === 'bad') {
              autoReplyText = "We’re truly sorry that your experience did not meet expectations. Your feedback is important to us. Our salon manager will review this and work to improve.";
            }

            if (autoReplyText) {
              await sendWhatsAppFreeformReply(branchId, fromPhone, autoReplyText);
            }

            if (rating === 'average' || rating === 'bad') {
              await salonRepository.logAudit(
                'CUSTOMER_FEEDBACK_ALERT',
                'AppointmentFeedback',
                appointmentId,
                'WhatsApp Webhook',
                `⚠️ Customer ${customerName} (${fromPhone}) rated visit as ${rating.toUpperCase()} for Ref ${apt?.booking_reference || 'N/A'}. Manager follow-up recommended.`
              );
            }
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

// 1. Get Branches: Owner sees all; Branch Manager sees only assigned branch; Others 403
app.get('/api/admin/branches', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (admin.role !== 'owner' && admin.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied: Only Salon Owners and Branch Managers can access branches.' });
    }

    const allBranches = await salonRepository.getBranches();
    if (admin.role === 'owner') {
      return res.json(allBranches);
    }

    // Branch manager: filter to assigned branch only
    const assignedBranches = allBranches.filter(b => b.id === admin.branch_id || b.manager_id === admin.id || b.manager_id === admin.user_id);
    return res.json(assignedBranches);
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
    const { customer_name, customer_phone, items, subtotal, discount, tax_amount, tip_amount, grand_total, paid_amount, payment_status, primary_payment_mode, cashier_name, notes, appointment_id, branch_id } = req.body;

    if (!customer_name || !customer_phone || !items || !items.length) {
      return res.status(400).json({ error: 'Missing customer or order items' });
    }

    const effectiveBranchId = branch_id || 'tgl-gachibowli-main';
    const order = await salonRepository.createOrder({
      appointment_id,
      branch_id: effectiveBranchId,
      customer_name,
      customer_phone,
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
      notes: notes || ''
    }, actor);

    // If linked to an appointment, mark appointment as Completed and schedule feedback.
    if (appointment_id) {
      const apt = await salonRepository.getAppointmentById(appointment_id);
      if (apt && apt.status !== 'Completed') {
        const completedAt = new Date().toISOString();
        await salonRepository.updateAppointment(appointment_id, {
          status: 'Completed',
          completed_at: completedAt
        }, actor);

        const scheduledTime = getFeedbackScheduledTime();
        await salonRepository.createScheduledFeedbackJob({
          appointment_id: apt.id,
          branch_id: apt.branch_id || effectiveBranchId,
          customer_name: apt.customer_name,
          customer_phone: apt.customer_phone,
          scheduled_at: scheduledTime,
          status: 'pending'
        });
      }
    }

    // Route WhatsApp digital receipt via the branch's dedicated WhatsApp connection
    salonRepository.getBranchById(effectiveBranchId).then(branch => {
      const branchName = branch?.name || 'The Glossy Looks';
      sendBranchWhatsAppNotification(
        effectiveBranchId,
        customer_phone,
        `Thank you for visiting ${branchName}, ${customer_name}! Your bill ${order.bill_number} for ₹${order.grand_total} has been settled (${order.primary_payment_mode}). We hope you loved your service!`
      ).catch(() => {});
    }).catch(() => {});

    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send the approved customer-feedback template manually after a POS bill.
// Receptionists can use this for an immediate follow-up; owner and manager can
// use it for their permitted branches. The automatic scheduled job remains active.
app.post('/api/admin/orders/:id/whatsapp/feedback', async (req, res) => {
  try {
    const admin = await getAuthAdmin(req);
    if (!admin || !['owner', 'manager', 'receptionist'].includes(admin.role)) {
      return res.status(403).json({ error: 'Access denied: only owner, manager, or reception staff can send feedback.' });
    }

    const order = (await salonRepository.getOrders()).find(item => item.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Bill not found.' });

    if (admin.role !== 'owner' && admin.branch_id && order.branch_id && admin.branch_id !== order.branch_id) {
      return res.status(403).json({ error: 'Access denied for this salon branch.' });
    }

    const result = await sendBranchWhatsAppTemplate({
      branchId: order.branch_id || 'tgl-gachibowli-main',
      recipientPhone: order.customer_phone,
      templateName: 'the_glossylooks_customer_feedback',
      orderId: order.id,
      customData: { customerName: order.customer_name }
    });

    const statusCode = result.sent ? 200 : result.status === 'pending_approval' ? 409 : 502;
    return res.status(statusCode).json({
      success: result.sent,
      status: result.status,
      message_id: result.messageId,
      error: result.error,
      diagnostics: result.diagnostics
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unable to send feedback message.' });
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
  const actor = (req.headers['x-admin-name'] as string) || 'Manager';
  const staff = await salonRepository.createStaff(req.body, actor);
  res.status(201).json(staff);
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
  const enq = await salonRepository.createEnquiry(req.body);
  res.status(201).json(enq);
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

  if (isProd || hasDist) {
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
    } catch (err) {
      console.warn('Vite dev middleware could not be loaded, falling back to static:', err);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
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
