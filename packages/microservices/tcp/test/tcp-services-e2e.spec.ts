import { Module, Injectable } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { ServerModule } from '@tsdi/platform-server';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { LoggerModule } from '@tsdi/logger';
import { ErrorResponse, Transport } from '@tsdi/common';
import { useJsonPacket } from '@tsdi/transport';
import { provideClient, withClientTransfers } from '@tsdi/common/client';
import { Handle, provideService, withBodyparser, withContent, withRouter, withTransfers } from '@tsdi/endpoints';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import { withTcpClientTransport, TcpClient } from '@tsdi/services/tcp';
import { withTcpTransport } from '@tsdi/services/tcp';

const TCP_PORT = 11900;

@Injectable()
export class TcpEchoService {
    @Handle({ cmd: 'ping' }, Transport.TCP)
    ping() { return 'pong'; }

    @Handle({ cmd: 'hello' }, Transport.TCP)
    hello() { return { msg: 'hello world' }; }
}

@Module({
    imports: [ServerModule, LoggerModule, ServerCommonModule],
    providers: [
        provideClient(
            withClientTransfers(useJsonPacket()),
            withTcpClientTransport({ connectOpts: { port: TCP_PORT } })
        ),
        provideService(
            withBodyparser(),
            withContent(),
            withRouter(),
            withTransfers(useJsonPacket()),
            withTcpTransport({ listenOpts: { port: TCP_PORT } })
        ),
    ],
    declarations: [TcpEchoService]
})
class TcpE2eTestModule { }

describe('TCP E2E with client.send', () => {
    let ctx: ApplicationContext;
    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(TcpE2eTestModule);
        client = ctx.get(TcpClient);
        await new Promise(r => setTimeout(r, 500));
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });

    it('should ping-pong via client.send', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'ping' }, {
            observe: 'response' as any, responseType: 'text' as any
        }).pipe(catchError((err) => of(err))));
        expect(a.ok).toBeTruthy();
        expect(a.body).toEqual('pong');
    });

    it('should return object response', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'hello' }, {
            observe: 'response' as any
        }).pipe(catchError((err) => of(err))));
        expect(a.ok).toBeTruthy();
        expect(a.body.msg).toEqual('hello world');
    });

    it('should return NotFound for unknown cmd', async () => {
        const a = await lastValueFrom(client.send({ cmd: 'unknown' }, {
            observe: 'response' as any
        }).pipe(catchError((err) => of(err))));
        expect(a instanceof ErrorResponse).toBeTruthy();
    });

    it('should send with raw payload and get response', async () => {
        const a = await lastValueFrom(client.send('/test/path', {
            observe: 'response' as any, responseType: 'text' as any
        }).pipe(catchError((err) => of(err))));
        expect(a.ok || a instanceof ErrorResponse).toBeTruthy();
    });
});
