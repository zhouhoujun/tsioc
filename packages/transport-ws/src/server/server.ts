import { ListenOpts, MicroService, TransportContext, InternalServerExecption } from '@tsdi/core';
import { Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import *  as ws from 'ws';
import * as https from 'http';
import { WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';


@Injectable()
export class WsServer extends MicroService<TransportContext> {

    private _server?: ws.Server;

    @InjectLog()
    private logger!: Logger;


    constructor(
        readonly endpoint: WsEndpoint,
        @Inject(WS_SERV_OPTS) private options: WsServerOpts) {
        super();
    }


    protected async onStartup(): Promise<any> {
        this._server = new ws.Server(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        if (this.options.listenOpts && this.options.serverOpts.server) {
            this.listen(this.options.listenOpts);
        }
    }

    protected async onShutdown(): Promise<any> {
        if (this._server) {
            await promisify(this._server.close, this._server)()
                .catch(err => {
                    this.logger?.error(err);
                    return err;
                });
        }
    }


    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.options.serverOpts.server) throw new InternalServerExecption();
        const server = this.options.serverOpts.server;
        if (server.listening) {
            return this;
        }
        const isSecure = server instanceof https.Server;
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://${host}:${port}`, '!')
                server.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://localhost:${port}`, '!')
                server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `ws${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            server.listen(opts, listeningListener);
        }
        return this;
    }

    // protected createServer(opts: WsServerOpts): ws.Server<ws.WebSocket> {
    //     return new ws.Server(opts.serverOpts);
    // }
    // protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
    //     const packet = this.context.get(PacketFactory);
    //     return new Connection(duplex, packet, opts);
    // }
    // protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
    //     const injector = this.context.injector;
    //     return new TransportContext(injector, req, res, this, injector.get(IncomingUtil))
    // }

    // protected override createDuplex(socket: ws.WebSocket): Duplex {
    //     return ws.createWebSocketStream(socket, { objectMode: true });
    // }


}