/**
 * Vercel catch-all API entry point.
 *
 * It keeps the existing Express routes unchanged, including:
 * - /api/health
 * - /api/services
 * - /api/whatsapp/webhook
 */
import app from '../server.ts';

export default function handler(req: any, res: any) {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health') && !req.url.startsWith('/robots.txt') && !req.url.startsWith('/sitemap.xml')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
