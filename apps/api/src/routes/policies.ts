import { Router } from 'express';

const router = Router();

const LANDING = 'https://nisemi.al';

router.get('/privacy', (_req, res) => res.redirect(301, `${LANDING}/privacy`));
router.get('/terms', (_req, res) => res.redirect(301, `${LANDING}/terms`));
router.get('/privacy.md', (_req, res) => res.redirect(301, `${LANDING}/privacy.md`));
router.get('/terms.md', (_req, res) => res.redirect(301, `${LANDING}/terms.md`));

export default router;
