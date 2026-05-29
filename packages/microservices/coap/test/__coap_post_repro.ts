import { Module } from '@tsdi/ioc';
import { Application } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Post, RequestBody } from '@tsdi/service';
import { useCoapTransport } from '../src/server';
import { provideClient } from '@tsdi/client';
import { withCoapTransport, CoapClient } from '../src/client';
import { lastValueFrom } from 'rxjs';
import * as coap from 'coap';

@Controller('/api/test')
class TestController {
    @Post('/echo')
    echo(@RequestBody() body: any) {
        console.log('echo-arg:', JSON.stringify(body));
        return { received: body };
    }
}

const PORT = 21336;

@Module({
    imports: [LoggerModule],
    declarations: [TestController],
    providers: [
        provideService(
            useRouter(),
            useCoapTransport({ listenOpts: { port: PORT, host: '127.0.0.1' }, asDefault: true })
        ),
        provideClient(
            withCoapTransport({ port: PORT, host: '127.0.0.1', microservice: true, asDefault: true })
        )
    ]
})
class ReproModule {}

(async () => {
    const ctx = await Application.run(ReproModule);
    await new Promise(r => setTimeout(r, 300));

    const req = coap.request({ host: '127.0.0.1', port: PORT, pathname: '/api/test/echo', method: 'POST', options: { Accept: 'application/json' } });
    req.on('response', (res: any) => {
        const body = res.payload?.toString() || '';
        console.log('native-post:', body);
    });
    req.on('error', (err: any) => console.error('native-post-err:', err));
    req.write(JSON.stringify({ value: 'hello' }));
    req.end();

    try {
        const result = await lastValueFrom(ctx.get(CoapClient).send('/api/test/echo', { method: 'POST', payload: { value: 'hello' } }));
        console.log('client-post:', JSON.stringify(result));
    } catch (err: any) {
        console.log('client-post-err:', err?.stack || err?.message || err);
    }

    
    await ctx.destroy();
})();
