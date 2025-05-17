import { getTypeName, Injectable, promisify } from '@tsdi/ioc';
import { LOCALHOST } from '@tsdi/common';
import { InternalServerException, ev } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { RequestContext, Server, ServerTransportFactory } from '@tsdi/endpoints';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { Subject, first, fromEvent, merge } from 'rxjs';
import { UdpServConfig } from './options';
import { UdpRequestHandler } from './handler';
import { sizeLimit } from '../consts';


@Injectable()
export class UdpServer extends Server<RequestContext, UdpServConfig> {

    private serv?: Socket | null;

    @InjectLog()
    private logger!: Logger;

    private destroy$: Subject<void>;

    constructor(readonly handler: UdpRequestHandler) {
        super();
        this.destroy$ = new Subject();
    }

    protected async onStartup(): Promise<any> {
        const options = this.getOptions();
        const serverOpts = {
            type: 'udp4',
            sendBufferSize: options.transportOptions?.limit ?? sizeLimit,
            ...options.serverOpts
        } as SocketOptions;
        this.serv = createSocket(serverOpts);
    }

    protected async onStart(): Promise<any> {
        await this.onStartup();
        if (!this.serv) throw new InternalServerException();

        const options = this.getOptions();

        this.serv.on(ev.CLOSE, () => this.logger.info('UDP microservice closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.handler.injector;
        const factory = injector.get(ServerTransportFactory);

        const isSecure = false;
        if (!options.protocol) {
            options.protocol = isSecure ? 'udps' : 'udp';
        }
        const transport = factory.create(injector, this.serv, options);

        transport.handle(this.handler, merge(this.destroy$, fromEvent(this.serv, ev.CLOSE).pipe(first())));

        const bindOpts = options.bindOpts ?? { port: 3000, address: LOCALHOST };
        this.serv.on(ev.LISTENING, () => {
            this.logger.info(getTypeName(this), 'access with url:', `udp${isSecure ? 's' : ''}://${bindOpts.address ?? LOCALHOST}:${bindOpts.port}`, '!');
        });

        this.serv.bind(bindOpts);

    }

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;
        this.destroy$.next();
        this.destroy$.complete();

        await promisify(this.serv.close, this.serv)()
            .catch(err => {
                this.logger?.error(err);
                return err;
            })
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }

}