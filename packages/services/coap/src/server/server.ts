
import { Inject, Injectable, isFunction, isNumber, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { InternalServerExecption, BindListenning, LOCALHOST, ev, TransportSessionFactory } from '@tsdi/common';
import { RequestHandler, Server } from '@tsdi/endpoints';
import { Socket, createSocket } from 'dgram';
import { COAP_SERV_OPTS, CoapServerOpts } from './options';
import { CoapEndpoint } from './endpoint';

/**
 * CoAP server.
 */
@Injectable()
export class CoapServer extends Server implements BindListenning {

    @InjectLog() logger!: Logger;
    protected isSecure = false;
    constructor(
        readonly endpoint: CoapEndpoint,
        @Inject(COAP_SERV_OPTS) protected options: CoapServerOpts) {
        super()
    }

    private _server?: Socket | null;

    listen(listenOpts?: { port?: number, listener?: () => void }): this;
    listen(listeningListener?: () => void): this;
    listen(port: number, listeningListener?: () => void): this;
    listen(arg1: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        if (isNumber(arg1)) {
            this._server.bind(arg1, listeningListener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}:${arg1}`, '!')
        } else if (isFunction(arg1)) {
            this._server.bind(listeningListener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}`, '!')
        } else if (arg1) {
            this._server.bind(arg1.port ?? 5683, arg1.listener);
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}:${arg1.port}`, '!')
        } else {
            this.logger.info(lang.getClassName(this), 'access with url:', `coap${this.isSecure ? 's' : ''}://${LOCALHOST}`, '!')
            this._server.bind(5683);
        }
        return this;
    }

    protected async setup(): Promise<any> {
        this._server = createSocket(this.options.serverOpts?.type ?? 'udp4');
    }

    protected async onStart(): Promise<any> {
        await this.setup();
        if (!this._server) throw new InternalServerExecption();

        this._server.on(ev.CLOSE, (err?: any) => {
            this.logger.info(`Coap ${this.options.transportOpts?.microservice ? 'microservice' : 'server'} closed!`);
            if (err) this.logger.error(err);
        });
        this._server.on(ev.ERROR, (err) => this.logger.error(err));

        const injector = this.endpoint.injector;
        const factory = injector.get(TransportSessionFactory);

        const isSecure = false;
        if (!this.options.protocol) {
            this.options.protocol = isSecure ? 'udps' : 'udp';
        }
        const transportOpts = this.options.transportOpts!;
        if (!transportOpts.transport) transportOpts.transport = 'udp';
        if (!transportOpts.serverSide) transportOpts.serverSide = true;
        const session = factory.create(this._server, this.options.transportOpts!);

        injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

        this.listen(this.options.listenOpts as any);

    }
    protected async onShutdown(): Promise<any> {
        if (!this._server) return;
        await promisify(this._server.close, this._server)()
            .catch(err => {
                this.logger?.error(err);
                return err;
            })
            .finally(() => {
                this._server?.removeAllListeners();
                this._server = null;
            });
    }

}
