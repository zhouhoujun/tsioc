import { Inject, Injectable, isFunction, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST } from '@tsdi/common';
import { BindServerEvent, RequestContext, Server, ServerTransportFactory } from '@tsdi/endpoints';
import { Socket, createSocket } from 'dgram';
import { COAP_BIND_FILTERS, COAP_BIND_GUARDS, COAP_BIND_INTERCEPTORS, COAP_SERV_OPTS, CoapServerOpts } from './options';
import { CoapRequestHandler } from './handler';
import { InternalServerExecption, ev } from '@tsdi/common/transport';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { lastValueFrom } from 'rxjs';

/**
 * CoAP server.
 */
@Injectable()
export class CoapServer extends Server<RequestContext, CoapServerOpts> {

    @InjectLog() logger!: Logger;
    protected isSecure = false;
    constructor(
        readonly handler: CoapRequestHandler,
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

    @EventHandler(BindServerEvent, {
        interceptorsToken: COAP_BIND_INTERCEPTORS,
        filtersToken: COAP_BIND_FILTERS,
        guardsToken: COAP_BIND_GUARDS
    })
    async bind(event: BindServerEvent<any>) {
        const options = this.getOptions();
        if (this._server || (isString(options.heybird) && event.transport !== options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(): Promise<any> {
        this._server = createSocket(this.options.serverOpts?.type ?? 'udp4');
    }

    protected async onStart(bindServer?: any): Promise<any> {
        const options = this.getOptions();
        if (options.heybird && !bindServer) return;
        if (bindServer) {
            this._server = bindServer;
        } else {
            await this.setup();

        }
        if (!this._server) throw new InternalServerExecption();

        this._server.on(ev.CLOSE, (err?: any) => {
            this.logger.info(`Coap ${options?.microservice ? 'microservice' : 'server'} closed!`);
            if (err) this.logger.error(err);
        });
        this._server.on(ev.ERROR, (err) => this.logger.error(err));

        const injector = this.handler.injector;
        const factory = injector.get(ServerTransportFactory);

        const isSecure = false;
        if (!options.protocol) {
            options.protocol = isSecure ? 'udps' : 'udp';
        }

        const session = factory.create(injector, this._server, options);
        session.listen(this.handler);

        if (!options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await lastValueFrom(injector.get(ApplicationEventMulticaster).emit(new BindServerEvent(this._server, 'tcp', this)));
        }

        if (options.listenOpts && !bindServer) this.listen(options.listenOpts as any);

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
