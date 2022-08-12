import { Endpoint, IncomingHeaders, Server } from '@tsdi/core';
import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { PacketParser } from '../packet';
import { TransportContext } from './context';
import { ListenOpts, TransportServerOpts } from './options';
import { ServerSession, ServerStream } from './stream';

@Abstract()
export abstract class ServerBuilder<T = any> {
    /**
     * startup server.
     * @param transport 
     * @param opts 
     * @returns 
     */
    async startup(transport: Server, opts: TransportServerOpts): Promise<T> {
        const { context, logger } = transport;
        const server = await this.buildServer(opts);
        const parser = this.getParser(context, opts);
        const sub = this.connect(server, parser, opts.connectionOpts)
            .subscribe({
                next: (conn) => {
                    conn.on('stream', (stream: ServerStream, headers: IncomingHeaders) => {
                        const ctx = this.buildContext(transport, stream, headers);
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

    abstract buildServer(opts: TransportServerOpts): Promise<T>;

    /**
     * listen
     * @param server 
     * @param opts 
     */
    abstract listen(server: T, opts: ListenOpts): Promise<void>;

    abstract getParser(context: InvocationContext, opts: TransportServerOpts): PacketParser;

    abstract buildContext(server: Server, stream: ServerStream, headers: IncomingHeaders): TransportContext;

    abstract connect(server: T, parser: PacketParser, opts?: any): Observable<ServerSession>;
    /**
     * handle request.
     * @param context 
     * @param endpoint 
     */
    abstract handle(context: TransportContext, endpoint: Endpoint): void;

}
