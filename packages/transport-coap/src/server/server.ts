
import { ExecptionFilter, Interceptor, ListenOpts, MiddlewareType } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable, tokenId } from '@tsdi/ioc';
import {
    CatchInterceptor, LogInterceptor, RespondInterceptor, TransportServer, TransportServerOpts, ServerRequest,
    ServerResponse, ConnectionOpts, StreamTransportStrategy, ServerConnection, ev, parseToDuplex
} from '@tsdi/transport';
import * as net from 'net';
import * as dgram from 'dgram';
import { Observable } from 'rxjs';
import { CoapTransportStrategy } from '../transport';


/**
 * Coap server options.
 */
@Abstract()
export abstract class CoapServerOpts extends TransportServerOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract baseOn?: 'tcp' | 'udp';
    abstract encoding?: BufferEncoding;
    abstract serverOpts: dgram.SocketOptions | net.ServerOpts;
}

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('COAP_SERV_INTERCEPTORS');

/**
 * CoAP server execption filters.
 */
export const COAP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTION_FILTERS');
/**
 * CoAP middlewares.
 */
export const COAP_MIDDLEWARES = tokenId<MiddlewareType[]>('COAP_MIDDLEWARES');

const defOpts = {
    json: true,
    encoding: 'utf8',
    transport: {
        strategy: CoapTransportStrategy
    },
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_EXECPTION_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    serverOpts:{
        type: 'udp4'
    },
    listenOpts: {
        port: 4000,
        host: 'localhost'
    }
} as CoapServerOpts;


/**
 * Coap server.
 */
@Injectable()
export class CoapServer extends TransportServer<net.Server | dgram.Socket, CoapServerOpts> {
    constructor(@Nullable() options: CoapServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defOpts;
    }

    protected buildServer(opts: CoapServerOpts): dgram.Socket | net.Server {
        return opts.baseOn == 'tcp' ? net.createServer(opts.serverOpts as net.ServerOpts) : dgram.createSocket(opts.serverOpts as dgram.SocketOptions)
    }

    protected override onConnection(server: net.Server | dgram.Socket, transport: StreamTransportStrategy, opts?: ConnectionOpts | undefined): Observable<ServerConnection> {
        if (server instanceof net.Server) {
            return this.tcpConnect(server, transport, opts);
        } else {
            return this.udpConnect(server, transport, opts);
        }

    }

    protected tcpConnect(server: net.Server, transport: StreamTransportStrategy, opts?: any): Observable<ServerConnection> {
        return new Observable((observer) => {
            const onError = (err: Error) => {
                observer.error(err);
            };
            const onConnection = (socket: net.Socket) => {
                observer.next(new ServerConnection(socket, transport, opts));
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

    protected udpConnect(server: dgram.Socket, parser: StreamTransportStrategy, opts?: any): Observable<ServerConnection> {
        return new Observable((observer) => {
            const connections = new Map<string, ServerConnection>()
            const onError = (err: Error) => {
                observer.error(err);
            };
            const onListening = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
                const addr = `${rinfo.family}_${rinfo.address}:${rinfo.port}`;
                let conn = connections.get(addr);
                if (!conn) {
                    conn = new ServerConnection(parseToDuplex(server, rinfo), parser, opts);
                    conn.once(ev.DISCONNECT, () => connections.delete(addr));
                    conn.once(ev.END, () => connections.delete(addr));
                    connections.set(addr, conn);
                }
                observer.next(conn);
            }
            const onClose = () => {
                observer.complete();
            }
            server.on(ev.ERROR, onError);
            server.on(ev.MESSAGE, onListening);
            server.on(ev.CLOSE, onClose)

            return () => {
                connections.forEach(c => {
                    c.destroy();
                })
                connections.clear();
                server.off(ev.ERROR, onError);
                server.off(ev.CLOSE, onClose);
                server.off(ev.MESSAGE, onListening);
            }
        })
    }

    protected listen(server: dgram.Socket | net.Server, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        if (server instanceof net.Server) {
            server.listen(opts, defer.resolve);
        } else {
            server.bind(opts, defer.resolve);
        }
        return defer.promise;
    }

}
