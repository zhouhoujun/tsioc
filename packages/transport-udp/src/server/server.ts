import { TransportContext, InternalServerExecption, Server } from '@tsdi/core';
import { Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { Packet, MESSAGE } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logs';
import { LOCALHOST, ev } from '@tsdi/transport';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { Subscription, finalize } from 'rxjs';
import { UDP_SERV_OPTS, UdpServerOpts } from './options';
import { UdpEndpoint } from './endpoint';
import { UdpTransportSession, UdpTransportSessionFactory } from '../transport';
import { UdpIncoming } from './incoming';
import { UdpOutgoing } from './outgoing';
import { UdpContext } from './context';
import { defaultMaxSize } from '../const';


@Injectable()
export class UdpServer extends Server<TransportContext> {

    private serv?: Socket | null;

    @InjectLog()
    private logger!: Logger;


    constructor(
        readonly endpoint: UdpEndpoint,
        @Inject(UDP_SERV_OPTS) private options: UdpServerOpts) {
        super();
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
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('UDP server closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const factory = this.endpoint.injector.get(UdpTransportSessionFactory);
        const session = factory.create(this.serv, this.options.transportOpts!);
        session.on(ev.MESSAGE, (topic, packet) => {
            try {
                this.requestHandler(session, topic, packet)
            } catch (err) {
                this.logger.error(err);
            }
        });


        const isSecure = false;
        const bindOpts = this.options.bindOpts ?? { port: 3000, address: LOCALHOST };
        this.serv.on(ev.LISTENING, () => {
            this.logger.info(lang.getClassName(this), 'access with url:', `udp${isSecure ? 's' : ''}://${bindOpts.address ?? LOCALHOST}:${bindOpts.port}`, '!');
        });

        this.serv.bind(bindOpts);

    }

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;

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


    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: UdpTransportSession, topic: string, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new UdpIncoming(session, packet);
        const res = new UdpOutgoing(session, packet.id, topic, packet.replyTo);

        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        const opts = this.options;
        opts.timeout && req.setTimeout && req.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: UdpIncoming, res: UdpOutgoing): UdpContext {
        const injector = this.endpoint.injector;
        return new UdpContext(injector, req, res, this.options);
    }


}