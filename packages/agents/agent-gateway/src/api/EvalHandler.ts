import { Injectable } from '@tsdi/ioc';
import { EvalRunner, EvalTask } from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';

@Injectable()
export class EvalHandler {
    constructor(private runner: EvalRunner) {}
    getRoutes(): GatewayRoute[] {
        const run: RouteHandler = async (req, res) => {
            if (req.method !== 'POST') return;
            let body = ''; for await (const chunk of req) body += String(chunk);
            const task = JSON.parse(body) as EvalTask;
            const report = await this.runner.run(task);
            res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ report }));
        };
        const list: RouteHandler = async (_req, res) => {
            const runs = await this.runner.reports.list();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ runs }));
        };
        return [{ method: 'POST', path: '/api/eval/run', handler: run }, { method: 'GET', path: '/api/eval', handler: list }];
    }
}
