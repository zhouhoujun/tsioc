import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Get } from '@tsdi/service';
import { useTcpTransport } from '../src/server';
import { TcpClient, withTcpTransport } from '../src/client';
import { provideClient } from '@tsdi/client';

@Controller('/test')
class DiagCtrl {
    @Get('/ping') ping() { return { ok: true }; }
}

const PORT = 11500;

@Module({
    imports: [LoggerModule],
    declarations: [DiagCtrl],
    providers: [
        provideService(useRouter(),
            useTcpTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })),
        provideClient(
            withTcpTransport({ connectOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true }))
    ]
})
class DiagModule {}

async function main() {
    const ctx = await Application.run(DiagModule);
    console.log('RUN OK');
    const client = ctx.get(TcpClient);
    console.log('GOT CLIENT, testing send...');
    const result = await client.send('/test/ping').toPromise();
    console.log('SEND OK:', result);
    await ctx.destroy();
    console.log('DESTROY OK');
    process.exit(0);
}
main().catch(e => { console.error('FAIL:', e.message, e.stack); process.exit(1); });
