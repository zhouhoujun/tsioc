import { InternalServerExecption, ListenOpts, ListenService, MicroService, Packet, TransportContext, TransportSession, TransportSessionFactory, createTransportContext } from '@tsdi/core';
import { Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev, hdr } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TcpMicroEndpoint } from './endpoint';
import { TCP_MICRO_SERV_OPTS, TcpMicroServiceOpts } from './options';


@Injectable()
export class TcpMicroService extends MicroService<TransportContext> implements ListenService {

    @InjectLog() logger!: Logger;

    private serv!: net.Server | tls.Server;
    private isSecure: boolean;

    constructor(readonly endpoint: TcpMicroEndpoint, @Inject(TCP_MICRO_SERV_OPTS) private options: TcpMicroServiceOpts) {
        super()
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions)?.cert
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


        this.serv.on(ev.CLOSE, () => this.logger.info('Http server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));

        const factory = this.endpoint.injector.get(TransportSessionFactory);
        if (this.serv instanceof tls.Server) {
            this.serv.on(ev.SECURE_CONNECTION, (socket) => {
                const session = factory.create(socket, this.options.transportOpts);
                session.on(ev.MESSAGE, (packet) => this.requestHandler(packet, session));
            })
        } else {
            this.serv.on(ev.CONNECTION, (socket) => {
                const session = factory.create(socket, this.options.transportOpts);
                session.on(ev.MESSAGE, (packet) => this.requestHandler(packet, session));
            })
        }

        if (this.options.listenOpts && this.options.autoListen) {
            this.listen(this.options.listenOpts)
        }
    }

    protected onShutdown(): Promise<any> {
        return promisify(this.serv.close, this.serv)()
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(packet: Packet, socket: TransportSession<tls.TLSSocket | net.Socket>): Subscription {
        const ctx = createTransportContext(this.endpoint.injector, {
            socket,
            url: packet.url ?? packet.headers?.[hdr.PATH] ?? '',
            method: packet.method ?? packet.headers?.[hdr.METHOD] ?? 'GET',
            payload: packet
        });
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
