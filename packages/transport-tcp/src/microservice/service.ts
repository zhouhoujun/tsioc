import { EndpointContext, InternalServerExecption, ListenOpts, MicroService, Packet } from '@tsdi/core';
import { TcpMicroServiceEndpoint } from './endpoint';
import { Inject, Injectable, isNumber, isString, lang } from '@tsdi/ioc';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_MICRO_SERV_OPTS, TcpMicroServiceOpts } from './options';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import { InjectLog, Logger } from '@tsdi/logs';


@Injectable()
export class TcpMicroService extends MicroService<EndpointContext> {

    @InjectLog() logger!: Logger;

    private serv!: net.Server | tls.Server;
    private isSecure: boolean;
    constructor(readonly endpoint: TcpMicroServiceEndpoint,  @Inject(TCP_MICRO_SERV_OPTS, {}) private options: TcpMicroServiceOpts) {
        super()
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions) ?.cert
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.serv) throw new InternalServerExecption();
        const isSecure = this.isSecure;
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!')
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            this.serv.listen(opts, listeningListener);
        }
        return this;
    }

    protected async onStartup(): Promise<any> {
        const opts = this.options;
        const serv = this.serv = this.isSecure ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
        return serv;
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();
        
        this.serv.on(ev.MESSAGE, (message) => this.requestHandler(message));
        this.serv.on(ev.CLOSE, () => this.logger.info('Http server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));

        if(this.options.listenOpts &&this.options.autoListen) {
            this.listen(this.options.listenOpts)
        }
    }

    protected async onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(packet: Packet): Subscription {
        const ctx = new EndpointContext(this.endpoint.injector, {payload: packet});
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => ctx.destroy()))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        return cancel;
    }

}
