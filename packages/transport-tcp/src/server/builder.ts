import { ListenOpts, Endpoint, OutgoingHeaders } from '@tsdi/core';
import { Injectable, InvocationContext, lang } from '@tsdi/ioc';
import { Connection, ev, PacketProtocol, ServerBuilder, ServerSession, ServerStream, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Observable } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TcpServerOpts } from './options';
import { TcpProtocol } from '../protocol';


@Injectable()
export class TcpServerBuilder extends ServerBuilder<net.Server | tls.Server, TransportServer> {
    protected async buildServer(opts: TcpServerOpts): Promise<net.Server> {
        return (opts.serverOpts as tls.TlsOptions).cert ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts)
    }
    protected listen(server: net.Server | tls.Server, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        server.listen(opts, defer.resolve);
        return defer.promise;
    }
    protected getParser(context: InvocationContext, opts: TransportServerOpts<any>): PacketProtocol {
        return context.get(opts.transport ?? TcpProtocol);
    }
    protected connect(server: net.Server | tls.Server, parser: PacketProtocol, opts?: any): Observable<Connection> {
        return new Observable((observer) => {
            const onError = (err: Error) => {
                observer.error(err);
            };
            const onConnection = (socket: net.Socket) => {
                observer.next(new ServerSession(socket, parser, opts));
            }
            const onClose = () => {
                observer.complete();
            }
            server.on(ev.ERROR, onError);
            server.on(ev.CONNECTION, onConnection);
            server.on(ev.CLOSE, onClose)

            return () => {
                server.off(ev.ERROR, onError);
                server.off(ev.CLOSE, onClose);
                server.off(ev.CONNECTION, onConnection);
            }
        })
    }

    private id = 0;
    getNextId(id?: number): number {
        if (id) {
            this.id = id + 1;
            return this.id;
        }
        return this.id += 2;
    }

    protected raiseStream(connection: Connection): void {
        const parser = connection.packet;
        connection.on(ev.DATA, (chunk) => {

            if (parser.isHeader(chunk)) {
                const packet = parser.parseHeader(chunk);
                const id = this.getNextId(packet.id);
                let stream = connection.state.streams.get(id);
                if (!stream) {
                    stream = new ServerStream(connection, id, {}, packet.headers as OutgoingHeaders);
                    connection.state.streams.set(id, stream);
                    connection.emit(ev.STREAM, stream, packet.headers)
                }
            }
        })
    }

    protected handle(ctx: TransportContext, endpoint: Endpoint<any, any>): void {
        const req = ctx.request;
        const cancel = endpoint.handle(req, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });
        const opts = ctx.target.getOptions() as TcpServerOpts;
        opts.timeout && req.stream.setTimeout(opts.timeout, () => {
            req.stream.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        ctx.request.stream.on(ev.TIMEOUT, () => {
            cancel?.unsubscribe();
        });
        ctx.request.stream.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }


}