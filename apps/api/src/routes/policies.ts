import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';

const router = Router();

const POLICIES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../landing/public',
);

const policyCache = new Map<string, { markdown: string; html: string }>();

async function loadPolicy(slug: 'privacy' | 'terms') {
  const cached = policyCache.get(slug);
  if (cached) return cached;
  const markdown = await readFile(path.join(POLICIES_DIR, `${slug}.md`), 'utf-8');
  const html = await marked.parse(markdown);
  const entry = { markdown, html };
  policyCache.set(slug, entry);
  return entry;
}

const PAGE_TITLES: Record<string, string> = {
  privacy: 'Politika e Privatësisë – Nisemi',
  terms: 'Kushtet e Përdorimit – Nisemi',
};

function htmlShell(title: string, body: string) {
  return `<!doctype html>
<html lang="sq">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 760px; margin: 0 auto; padding: 32px 20px; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  h2 { font-size: 20px; margin-top: 32px; }
  h3 { font-size: 16px; margin-top: 24px; }
  em { color: #666; }
  a { color: #c81f3a; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; }
  hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 90%; }
</style>
</head>
<body>${body}</body>
</html>`;
}

router.get('/privacy', async (_req, res) => {
  const { html } = await loadPolicy('privacy');
  res.type('html').send(htmlShell(PAGE_TITLES.privacy, html));
});

router.get('/terms', async (_req, res) => {
  const { html } = await loadPolicy('terms');
  res.type('html').send(htmlShell(PAGE_TITLES.terms, html));
});

router.get('/privacy.md', async (_req, res) => {
  const { markdown } = await loadPolicy('privacy');
  res.type('text/markdown; charset=utf-8').send(markdown);
});

router.get('/terms.md', async (_req, res) => {
  const { markdown } = await loadPolicy('terms');
  res.type('text/markdown; charset=utf-8').send(markdown);
});

export default router;
