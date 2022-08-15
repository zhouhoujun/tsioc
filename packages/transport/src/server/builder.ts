import { Endpoint, IncomingHeaders, Server } from '@tsdi/core';
import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Connection } from '../connection';
import { ev } from '../consts';
import { PacketParser } from '../packet';
import { TransportContext } from './context';
import { ListenOpts, TransportServerOpts } from './options';
import { ServerStream } from './stream';

@Abstract()
export abstract class ServerBuilder<T = any, TS extends Server = Server> {
    /**
     * startup server.
     * @param transport 
     * @param opts 
     * @returns 
     */
    async startup(transport: TS, opts: TransportServerOpts): Promise<T> {
        const { context, logger } = transport;
        const server = await this.buildServer(opts);
        const parser = this.getParser(context, opts);
        const sub = this.connect(server, parser, opts.connectionOpts)
            .subscribe({
                next: (conn) => {
                    conn.on(ev.STREAM, (stream: ServerStream, headers: IncomingHeaders) => {
                        const ctx = this.buildContext(transport, conn, stream, headers);
                        this.handle(ctx, transport.endpoint());
                    });
                },
                error: (err) => {
                    logger.error(err);
                },
                complete: () => {
                    logger.error('server shutdown');
                }
            });
        context.onDestroy(() => sub?.unsubscribe())
        await this.listen(server, opts.listenOpts);
        return server;
    }

    protected abstract buildServer(opts: TransportServerOpts): Promise<T>;

    /**
     * listen
     * @param server 
     * @param opts 
     */
    protected abstract listen(server: T, opts: ListenOpts): Promise<void>;

    protected abstract getParser(context: InvocationContext, opts: TransportServerOpts): PacketParser;

    protected abstract buildContext(transport: TS, connection: Connection, stream: ServerStream, headers: IncomingHeaders): TransportContext;

    protected abstract connect(server: T, parser: PacketParser, opts?: any): Observable<Connection>;
    /**
     * handle request.
     * @param context 
     * @param endpoint 
     */
    protected abstract handle(context: TransportContext, endpoint: Endpoint): void;

}
