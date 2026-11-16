import expect = require('expect');
import * as http from 'node:http';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import {
    provideService, useRouter, useGracefulShutdown, Controller, Get, InFlightTracker, SetupServices
} from '@tsdi/service';
import { useHttpTransport } from '../src/server';

const PORT = 21890;

@Controller('/inflight')
class InFlightController {
    @Get('/slow')
    async slow(): Promise<{ ok: boolean }> {
        await new Promise(resolve => setTimeout(resolve, 150));
        return { ok: true };
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [InFlightController],
    providers: [provideService(
        useRouter(),
        useGracefulShutdown({ drainTimeoutMs: 2000 }),
        useHttpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
    )]
})
class InFlightModule { }

function get(path: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port: PORT, path }, res => {
            const chunks: Buffer[] = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
        });
        req.on('error', reject);
    });
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('HTTP in-flight drain', () => {
    let ctx: ApplicationContext;

    beforeEach(async () => {
        ctx = await Application.run(InFlightModule);
    });

    afterEach(async () => {
        if (ctx) {
            await ctx.close();
        }
    });

    it('counts real HTTP requests while they are being handled', async () => {
        const setup = ctx.get(SetupServices);
        const server: any = setup.getServices()[0].instance;
        const tracker = server.injector.get(InFlightTracker, null);
        expect(tracker).toBeTruthy();

        const request = get('/inflight/slow');
        await delay(40);
        expect(tracker.size).toBe(1);

        const response = await request;
        expect(response.status).toBe(200);
        expect(tracker.size).toBe(0);
    });

    it('close() waits for an in-flight request instead of cutting it off', async () => {
        const request = get('/inflight/slow');
        await delay(40);

        await ctx.close();
        const response = await request;

        expect(response.status).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ ok: true });
        ctx = undefined as any;
    });
});
