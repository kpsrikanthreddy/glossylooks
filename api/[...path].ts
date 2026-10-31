/**
 * Vercel catch-all API entry point.
 *
 * It keeps the existing Express routes unchanged, including:
 * - /api/health
 * - /api/services
 * - /api/whatsapp/webhook
 */
import app from '../server.ts';

export default app;
