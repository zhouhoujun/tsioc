
import { AssetContext, InternalServerExecption, BindListenning, MicroService, Outgoing, TransportSessionFactory, TransportSession, Packet, GET } from '@tsdi/core';
import { Inject, Injectable, isFunction, isNumber, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { Server, IncomingMessage, OutgoingMessage } from 'coap';
import { COAP_SERVER_OPTS, CoapServerOpts } from './options';

import { CoapEndpoint } from './endpoint';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import { CoapOutgoing } from './outgoing';
import { CoapContext } from './context';

/**
 * Coap server.
 */
@Injectable()
export class CoapServer extends MicroService<AssetContext, Outgoing> implements BindListenning {

    @InjectLog() logger!: Logger;

    constructor(
        readonly endpoint: CoapEndpoint,
        @Inject(COAP_SERVER_OPTS) private options: CoapServerOpts) {
        super()
    }

    private _server?: Server;

    listen(listenOpts?: { port?: number, listener?: () => void }): this;
    listen(listeningListener?: () => void): this;
    listen(port: number, listeningListener?: () => void): this;
    listen(arg1: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        if (isNumber(arg1)) {
            this._server.listen(arg1, listeningListener);
        } else if (isFunction(arg1)) {
            this._server.listen(listeningListener)
        } else if (arg1) {
            this._server.listen(arg1.prot, arg1.listener);
        } else {
            this._server.listen();
        }
        return this;
    }

    protected async onStartup(): Promise<any> {
        this._server = this.createServer(this.options);
    }
    protected async onStart(): Promise<any> {
        if (!this._server) throw new InternalServerExecption();

        this._server.on(ev.CLOSE, (err) => {
            this.logger.info('Coap Server closed!');
            if (err) this.logger.error(err);
        });
        this._server.on(ev.ERROR, (err) => this.logger.error(err));

        this._server.on(ev.REQUEST, (req, res) => this.requestHandler(req, res))

        if (this.options.listenOpts) {
            this.listen(this.options.listenOpts as any);
        }
    }
    protected async onShutdown(): Promise<any> {
        if (!this._server) return;
        await promisify(this._server.close, this._server)();
    }

    protected createServer(opts: CoapServerOpts): Server {
        return new Server(this.options.serverOpts)
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(req: IncomingMessage, res: OutgoingMessage): Subscription {

        const ctx = this.createContext(req, CoapOutgoing.parse(res));
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        // const opts = this.options;
        // opts.timeout && req..setTimeout && req.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: IncomingMessage, res: CoapOutgoing): CoapContext {
        const injector = this.endpoint.injector;
        return new CoapContext(injector, req, res);
    }


}
