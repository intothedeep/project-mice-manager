// SOP controller — manual trigger endpoint for the P0 batch.
//
// POST /internal/run-sop-checks
//   Triggers both generators synchronously and returns a per-generator summary.
//   No auth guard in P0 (internal endpoint; Clerk auth deferred to P2).
//   Cron/event-driven scheduling is P1 — this manual trigger is the P0 surface.
//
// Response body:
//   { plug_check: { generated, skipped }, genotype: { generated, skipped } }

import { Router, Request, Response } from 'express';
import { runSopChecks } from '../services/sopService';

const router = Router();

router.post('/run-sop-checks', async (_req: Request, res: Response) => {
    try {
        const summary = await runSopChecks();
        res.status(200).json({ ok: true, data: summary });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ ok: false, error: message });
    }
});

export { router as sopRouter };
