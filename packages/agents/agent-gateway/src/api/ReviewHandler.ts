import { Injectable } from '@tsdi/ioc';
import { ReviewFindingsStore } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';

@Injectable()
export class ReviewHandler {
    constructor(
        private reviews: ReviewFindingsStore,
        private owners: SessionOwnerStore
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const listReviews: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/reviews', `http://${host}`);
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            if (!await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const commit = url.searchParams.get('commit')?.trim() || undefined;
            const runs = await this.reviews.list(sessionId, commit);
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ runs: runs.map(run => this.toRunView(run)) }));
        };

        const getReview: RouteHandler = async (req, res) => {
            const host = req.headers?.host ?? 'localhost';
            const url = new URL(req.url ?? '/api/reviews/', `http://${host}`);
            const id = decodeURIComponent(url.pathname.slice('/api/reviews/'.length) || '');
            const sessionId = url.searchParams.get('sessionId');
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principalId = getRequestPrincipalId(req);
            if (!await this.owners.isOwner(sessionId, principalId)) {
                res.writeHead(403, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const run = await this.reviews.get(id);
            if (!run || run.sessionId !== sessionId) {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'not found' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ run: this.toRunView(run) }));
        };

        return [
            { method: 'GET', path: '/api/reviews', handler: listReviews },
            { method: 'GET', path: '/api/reviews/:id', handler: getReview }
        ];
    }

    private toRunView(run: import('@tsdi/agent').ReviewRun): Record<string, any> {
        return {
            id: run.id,
            sessionId: run.sessionId,
            base: run.base,
            range: run.range ?? null,
            paths: run.paths ?? null,
            commitSha: run.commitSha ?? null,
            files: run.files,
            diffSummary: run.diffSummary ?? null,
            createdAt: run.createdAt,
            findings: run.findings
        };
    }
}
