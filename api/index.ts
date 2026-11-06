/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vercel Serverless Function entry point for The Glossy Looks API.
 * Dispatches all incoming /api requests to the Express application.
 */
import app from '../server.ts';

export default function handler(req: any, res: any) {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health') && !req.url.startsWith('/robots.txt') && !req.url.startsWith('/sitemap.xml')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
