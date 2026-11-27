import expect = require('expect');
import { doctorUrl, formatDoctorReport, runDoctor } from '../src/doctor';
import { GatewayDoctorReport } from '../src/controller';

describe('admin doctor cli', () => {
    const report: GatewayDoctorReport = {
        status: 'warn',
        version: 3,
        generatedAt: '2026-11-16T00:00:00.000Z',
        routes: 2,
        services: ['users-service'],
        openCircuits: 1,
        alerts: 0,
        checks: [
            { id: 'routes', status: 'ok', message: '2 route(s) configured' },
            { id: 'circuits', status: 'warn', message: '1 circuit(s) open' }
        ],
        capabilities: [{
            name: 'HTTP',
            delivery: 'at-most-once',
            consumerIdempotency: false,
            ordering: 'none',
            warnings: ['HTTP: at-most-once delivery']
        }]
    };

    function response(status: number, body?: any) {
        return {
            status,
            ok: status >= 200 && status < 300,
            async json() { return body; }
        } as Response;
    }

    it('builds the doctor endpoint url from a base url', () => {
        expect(doctorUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000/api/gateway-admin/doctor');
        expect(doctorUrl('http://127.0.0.1:3000/')).toBe('http://127.0.0.1:3000/api/gateway-admin/doctor');
        expect(doctorUrl('http://127.0.0.1:3000/api/gateway-admin/doctor')).toBe('http://127.0.0.1:3000/api/gateway-admin/doctor');
    });

    it('requests the report with an optional bearer token', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const result = await runDoctor({
            url: 'http://admin.local',
            token: 'secret',
            fetchImpl: (async (url: any, init: any) => {
                calls.push({ url: String(url), init });
                return response(200, report);
            }) as any
        });

        expect(calls[0].url).toBe('http://admin.local/api/gateway-admin/doctor');
        expect(calls[0].init.headers).toEqual({ authorization: 'Bearer secret' });
        expect(result.ok).toBe(false);
        expect(result.report.status).toBe('warn');
    });

    it('reports unauthorized and unavailable endpoints with actionable errors', async () => {
        await expect(runDoctor({
            url: 'http://admin.local',
            fetchImpl: (async () => response(401)) as any
        })).rejects.toThrow(/pass --token/);

        await expect(runDoctor({
            url: 'http://admin.local',
            fetchImpl: (async () => response(503)) as any
        })).rejects.toThrow(/check that the admin console is running/);
    });

    it('formats a human-readable report', () => {
        const text = formatDoctorReport(report);
        expect(text).toContain('gateway doctor: WARN');
        expect(text).toContain('version: 3  routes: 2  services: 1  open circuits: 1  alerts: 0');
        expect(text).toContain('[ok] routes: 2 route(s) configured');
        expect(text).toContain('[warn] circuits: 1 circuit(s) open');
        expect(text).toContain('[capability] HTTP: delivery=at-most-once idempotent=false ordering=none warnings=1');
    });
});
