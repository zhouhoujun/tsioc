import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useRouter } from '@tsdi/service';
import { useHttpTransport } from '../src/server';
import { withHttpTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import { HttpClient } from '../src/client/client';
import { lastValueFrom } from 'rxjs';
import expect = require('expect');

const PORT = 3011;

@Controller('/api/shutdown')
class ShutdownController {
    @Get('/ping')
    ping() {
        return { ok: true };
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [ShutdownController],
    providers: [
        provideService(useRouter(),
            useHttpTransport({
                majorVersion: 2,
                listenOpts: { port: PORT, host: '127.0.0.1' },
                asDefault: true
            })),
        provideClient(
            withHttpTransport({
                authority: `http://127.0.0.1:${PORT}`,
                asDefault: true
            }))
    ]
})
class Http2ClientShutdownModule {}

describe('HTTP/2 client shutdown', () => {
    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(Http2ClientShutdownModule);
        client = ctx.get(HttpClient);
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }
    });

    it('should close owned http2 client session during application shutdown', async () => {
        const response: any = await lastValueFrom(client.get('/api/shutdown/ping', {
            observe: 'response' as any
        }));
        expect(response.status).toBe(200);

        const session = client.getSession();
        expect(session).toBeDefined();
        expect(session!.closed || session!.destroyed).toBe(false);

        await ctx.close();

        expect(session!.closed || session!.destroyed).toBe(true);
        ctx = null as any;
    });
});
