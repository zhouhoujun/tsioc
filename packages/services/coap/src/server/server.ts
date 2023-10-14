
import { Inject, Injectable, isFunction, isNumber, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { InternalServerExecption, BindListenning, LOCALHOST, ev } from '@tsdi/common';
import { Server } from '@tsdi/endpoints';
import { createServer, Server as CoServer } from 'coap';
import { COAP_MICRO_SERV_OPTS, CoapServerOpts } from './options';
import { CoapEndpoint } from './endpoint';

/**
 * CoAP server.
 */
@Injectable({ static: false })
export class CoapServer extends Server implements BindListenning {

    @InjectLog() logger!: Logger;
    protected isSecure = false;
    protected micro = true;
    constructor(
        readonly endpoint: CoapEndpoint,
        @Inject(COAP_MICRO_SERV_OPTS) protected options: CoapServerOpts) {
        super()
    }

    private _server?: CoServer;

    listen(listenOpts?: { port?: number, listener?: () => void }): this;
    listen(listeningListener?: () => void): this;
    listen(port: number, listeningListener?: () => void): this;
    listen(arg1: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        if (isNumber(arg1)) {
            this._server.listen(arg1, listeningListener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}:${arg1}`, '!')
        } else if (isFunction(arg1)) {
            this._server.listen(listeningListener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}`, '!')
        } else if (arg1) {
            this._server.listen(arg1.port, arg1.listener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}:${arg1.port}`, '!')
        } else {
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}`, '!')
            this._server.listen();
        }
        return this;
    }

    protected async setup(): Promise<any> {
        this._server = createServer(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        await this.setup();
        if (!this._server) throw new InternalServerExecption();

        this._server.on(ev.CLOSE, (err) => {
            this.logger.info(`Coap ${this.micro ? 'microservice' : 'server'} closed!`);
            if (err) this.logger.error(err);
        });
        this._server.on(ev.ERROR, (err) => this.logger.error(err));

        this._server.on(ev.REQUEST, (req, res) => this.requestHandler(req, res))

        this.listen(this.options.listenOpts as any);

    }
    protected async onShutdown(): Promise<any> {
        if (!this._server) return;
        await promisify(this._server.close, this._server)();
    }

}
