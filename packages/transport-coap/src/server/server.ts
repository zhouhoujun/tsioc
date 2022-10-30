
import { ExecptionFilter, Interceptor, ListenOpts, MiddlewareType, Router } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable, tokenId } from '@tsdi/ioc';
import {
    LogInterceptor, TransportServer, TransportServerOpts,
    ConnectionOpts, ev, parseToDuplex, Connection, IncomingMessage, OutgoingMessage, TransportContext,
    ExecptionFinalizeFilter, TransportExecptionHandlers, ContentMiddleware, SessionMiddleware,
    EncodeJsonMiddleware, BodyparserMiddleware
} from '@tsdi/transport';
import * as net from 'net';
import * as dgram from 'dgram';
import { Observable } from 'rxjs';
import { CoapPacketFactory, CoapVaildator } from '../transport';
import { Duplex } from 'form-data';


/**
 * Coap server options.
 */
@Abstract()
export abstract class CoapServerOpts extends TransportServerOpts<IncomingMessage, OutgoingMessage> {
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
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<IncomingMessage, OutgoingMessage>[]>('COAP_SERV_INTERCEPTORS');

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
        strategy: CoapVaildator
    },
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_EXECPTION_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
    interceptors:[
        LogInterceptor
    ],
    execptions: [
        ExecptionFinalizeFilter,
        TransportExecptionHandlers
    ],
    middlewares: [
        ContentMiddleware,
        SessionMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        Router
    ],
    serverOpts: {
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
export class CoapServer extends TransportServer<IncomingMessage, OutgoingMessage, net.Server | dgram.Socket, CoapServerOpts> {

    constructor(@Nullable() options: CoapServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defOpts;
    }

    protected override createServer(opts: CoapServerOpts): dgram.Socket | net.Server {
        return opts.baseOn == 'tcp' ? net.createServer(opts.serverOpts as net.ServerOpts) : dgram.createSocket(opts.serverOpts as dgram.SocketOptions)
    }

    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(CoapPacketFactory);
        return new Connection(socket, packet, opts)
    }

    protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
        const injector = this.context.injector;
        return new TransportContext(injector, req, res, this, injector.get(CoapVaildator))
    }

    // protected override onConnection(server: net.Server | dgram.Socket, opts?: ConnectionOpts): Observable<Connection> {
    //     const packetor = this.context.get(Packetor);
    //     if (server instanceof net.Server) {
    //         return this.tcpConnect(server, packetor, opts);
    //     } else {
    //         return this.udpConnect(server, packetor, opts);
    //     }

    // }

    // protected tcpConnect(server: net.Server, packetor: Packetor, opts?: any): Observable<Connection> {
    //     return new Observable((observer) => {
    //         const onError = (err: Error) => {
    //             observer.error(err);
    //         };
    //         const onConnection = (socket: net.Socket) => {
    //             observer.next(new Connection(socket, packetor, opts));
    //         }
    //         const onClose = () => {
    //             observer.complete();
    //         }
    //         server.on(ev.ERROR, onError);
    //         server.on(ev.CONNECTION, onConnection);
    //         server.on(ev.CLOSE, onClose)

    //         return () => {
    //             server.off(ev.ERROR, onError);
    //             server.off(ev.CLOSE, onClose);
    //             server.off(ev.CONNECTION, onConnection);
    //         }
    //     })
    // }

    // protected udpConnect(server: dgram.Socket, packetor: Packetor, opts?: any): Observable<Connection> {
    //     return new Observable((observer) => {
    //         const connections = new Map<string, Connection>()
    //         const onError = (err: Error) => {
    //             observer.error(err);
    //         };
    //         const onListening = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    //             const addr = `${rinfo.family}_${rinfo.address}:${rinfo.port}`;
    //             let conn = connections.get(addr);
    //             if (!conn) {
    //                 conn = new Connection(parseToDuplex(server, rinfo), packetor, opts);
    //                 conn.once(ev.DISCONNECT, () => connections.delete(addr));
    //                 conn.once(ev.END, () => connections.delete(addr));
    //                 connections.set(addr, conn);
    //             }
    //             observer.next(conn);
    //         }
    //         const onClose = () => {
    //             observer.complete();
    //         }
    //         server.on(ev.ERROR, onError);
    //         server.on(ev.MESSAGE, onListening);
    //         server.on(ev.CLOSE, onClose)

    //         return () => {
    //             connections.forEach(c => {
    //                 c.destroy();
    //             })
    //             connections.clear();
    //             server.off(ev.ERROR, onError);
    //             server.off(ev.CLOSE, onClose);
    //             server.off(ev.MESSAGE, onListening);
    //         }
    //     })
    // }

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
