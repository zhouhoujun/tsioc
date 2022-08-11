import { IncomingHeaders, Endpoint } from '@tsdi/core';
import { Injectable, InvocationContext, lang } from '@tsdi/ioc';
import { ServerSession, ServerBuilder, ListenOpts, ServerStream, TransportContext, TransportServer, ServerRequest, ServerResponse, ev, TransportServerOpts } from '@tsdi/transport';
import { Observable } from 'rxjs';
import * as net from 'net';
import * as dgram from 'dgram';
import { CoapServerOpts } from './server';
import { PacketParser } from 'packages/transport/src/packet';

@Injectable()
export class CoapServerBuilder extends ServerBuilder<net.Server | dgram.Socket> {

    async buildServer(opts: CoapServerOpts): Promise<net.Server | dgram.Socket> {
        return opts.baseOn == 'tcp' ? net.createServer(opts.serverOpts as net.ServerOpts) : dgram.createSocket(opts.serverOpts as dgram.SocketOptions)
    }

    listen(server: net.Server | dgram.Socket, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        if (server instanceof net.Server) {
            server.listen(opts, defer.resolve);
        } else {
            server.bind(opts, defer.resolve);
        }
        return defer.promise;
    }

    buildContext(server: TransportServer, stream: ServerStream, headers: IncomingHeaders): TransportContext {
        const request = new ServerRequest(stream, headers);
        const response = new ServerResponse(stream, headers);
        const parent = server.context;
        return new TransportContext(parent.injector, request, response, server, { parent });
    }

    getParser(context: InvocationContext, opts: CoapServerOpts): PacketParser {
        return context.get(PacketParser);
    }

    connect(server: net.Server | dgram.Socket, parser: PacketParser, opts?: any): Observable<ServerSession> {
        if (server instanceof net.Server) {
            return this.tcpConnect(server, parser, opts);
        } else {
            return this.udpConnect(server, parser, opts);
        }

    }

    protected tcpConnect(server: net.Server, parser: PacketParser, opts?: any): Observable<ServerSession> {
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

    protected udpConnect(server: dgram.Socket, parser: PacketParser, opts?: any): Observable<ServerSession> {
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

    handle(ctx: TransportContext, endpoint: Endpoint<any, any>): void {
        const req = ctx.request;
        const cancel = endpoint.handle(req, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });
        const opts = ctx.target.getOptions() as TransportServerOpts;
        // opts.timeout && req.setTimeout(opts.timeout, () => {
        //     req.emit(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.CLOSE, async () => {
            await lang.delay(500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end()
            }
        })
    }


}
