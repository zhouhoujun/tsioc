import { Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { LOCALHOST } from '@tsdi/common';
import { InternalServerExecption, ev } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { Server, ServerTransportSessionFactory } from '@tsdi/endpoints';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { Subject, first, fromEvent, merge } from 'rxjs';
import { UDP_SERV_OPTS, UdpServerOpts } from './options';
import { UdpEndpointHandler } from './handler';
import { defaultMaxSize } from '../consts';


@Injectable()
export class UdpServer extends Server {

    private serv?: Socket | null;

    @InjectLog()
    private logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: UdpEndpointHandler,
        @Inject(UDP_SERV_OPTS) private options: UdpServerOpts) {
        super();
        this.destroy$ = new Subject();
    }

    protected async onStartup(): Promise<any> {
        const serverOpts = {
            type: 'udp4',
            sendBufferSize: this.options.transportOpts?.maxSize ?? defaultMaxSize,
            ...this.options.serverOpts
        } as SocketOptions;
        this.serv = createSocket(serverOpts);
    }

    protected async onStart(): Promise<any> {
        await this.onStartup();
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('UDP microservice closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.handler.injector;
        const factory = injector.get(ServerTransportSessionFactory);

        const isSecure = false;
        if (!this.options.protocol) {
            this.options.protocol = isSecure ? 'udps' : 'udp';
        }
        const transportOpts = this.options.transportOpts!;
        if (!transportOpts.transport) transportOpts.transport = 'udp';
        if (!transportOpts.serverSide) transportOpts.serverSide = true;
        const session = factory.create(this.serv, this.options.transportOpts!);

        session.listen(this.handler, merge(this.destroy$, fromEvent(this.serv, ev.CLOSE).pipe(first())));
        // injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

        const bindOpts = this.options.bindOpts ?? { port: 3000, address: LOCALHOST };
        this.serv.on(ev.LISTENING, () => {
            this.logger.info(lang.getClassName(this), 'access with url:', `udp${isSecure ? 's' : ''}://${bindOpts.address ?? LOCALHOST}:${bindOpts.port}`, '!');
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