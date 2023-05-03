
import { AssetContext, InternalServerExecption, ListenOpts, ListenService, Outgoing, Server } from '@tsdi/core';
import { Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import * as net from 'net';
import * as dgram from 'dgram';
import { COAP_SERVER_OPTS, CoapServerOpts } from './options';
import { CoapEndpoint } from './endpoint';
import { InjectLog, Logger } from '@tsdi/logs';

/**
 * Coap server.
 */
@Injectable()
export class CoapServer extends Server<AssetContext, Outgoing> implements ListenService {

    @InjectLog() logger!: Logger;

    constructor(readonly endpoint: CoapEndpoint, @Inject(COAP_SERVER_OPTS, { nullable: true }) private options: CoapServerOpts) {
        super()
    }

    private _secure?: boolean;
    get isSecure() {
        return this._secure === true
    }
    _server?: dgram.Socket | net.Server;


    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        const isSecure = this.isSecure;
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!');
                if (this._server instanceof net.Server) {
                    this._server.listen(port, host, listeningListener);
                } else {
                    this._server.bind(port, host, listeningListener);
                }
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!')
                if (this._server instanceof net.Server) {
                    this._server.listen(port, listeningListener);
                } else {
                    this._server.bind(port, listeningListener);
                }
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            if (this._server instanceof net.Server) {
                this._server.listen(opts, listeningListener);
            } else {
                this._server.bind(opts, listeningListener);
            }
        }
        return this;
    }

    protected async onStartup(): Promise<any> {
        this._server = this.createServer(this.options);
    }
    protected async onStart(): Promise<any> {
        if(this.options.listenOpts){
            this.listen(this.options.listenOpts);
        }
    }
    protected async onShutdown(): Promise<any> {
        if (!this._server) return;
        await promisify(this._server.close, this._server)();
    }

    protected createServer(opts: CoapServerOpts): dgram.Socket | net.Server {
        return opts.baseOn == 'tcp' ? net.createServer(opts.serverOpts as net.ServerOpts) : dgram.createSocket(opts.serverOpts as dgram.SocketOptions)
    }



    // protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(CoapPacketFactory);
    //     return new DuplexConnection(socket, packet, opts)
    // }

    // protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
    //     const injector = this.context.injector;
    //     return new TransportContext(injector, req, res, this, injector.get(CoapVaildator))
    // }

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

}
