import { ListenOpts, MESSAGE, MircoServiceRouter, Outgoing, Packet, Server, TransportContext, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Execption, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { Client, connect } from 'mqtt';
import { MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttEndpoint } from './endpoint';
import { Content, ContentOptions, LOCALHOST, ev } from '@tsdi/transport';
import { MqttIncoming } from './incoming';
import { MqttOutgoing } from './outgoing';
import { Subscription, finalize } from 'rxjs';
import { MqttContext } from './context';



@Injectable()
export class MqttServer extends Server<TransportContext, Outgoing> {

    @InjectLog()
    private logger!: Logger;

    private subscribes?: string[];
    private mqtt?: Client | null;

    constructor(
        readonly endpoint: MqttEndpoint,
        @Inject(MQTT_SERV_OPTS) private options: MqttServiceOpts
    ) {
        super();
        if (this.options.content) {
            this.endpoint.injector.setValue(ContentOptions, this.options.content);
        }
    }

    protected override async onStartup(): Promise<any> {
        const opts = {
            host: LOCALHOST,
            port: 1883,
            withCredentials: !!this.options.connectOpts?.cert,
            ...this.options.connectOpts
        };
        this.endpoint.injector.setValue(ListenOpts, opts);
        this.mqtt = opts.url ? connect(opts.url, opts) : connect(opts);

        this.mqtt.on(ev.ERROR, (err) => this.logger.error(err));

        const defer = lang.defer();
        this.mqtt.on(ev.CONNECT, defer.resolve);
        await defer.promise;

    }

    protected override async onStart(): Promise<any> {
        if (!this.mqtt) throw new Execption('Mqtt connection cannot be null');

        const router = this.endpoint.injector.get(MircoServiceRouter).get('mqtt');
        const subscribes = this.subscribes = Array.from(router.patterns.values());
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            subscribes.push(`${this.options.content.prefix}/#`);
        }

        await promisify(this.mqtt.subscribe, this.mqtt)(subscribes)
            .catch(err => {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
                throw err;
            });

        const factory = this.endpoint.injector.get(TransportSessionFactory);
        const session = factory.create(this.mqtt, { ...this.options.transportOpts, serverSide: true });

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subscribes
        );

    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt) return;
        if (this.subscribes) await promisify(this.mqtt.unsubscribe, this.mqtt)(this.subscribes);
        // this.mqtt.end();
        await promisify<void, boolean | undefined>(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });

        this.mqtt = null;
    }


    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<Client>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new MqttIncoming(session, packet);
        const res = new MqttOutgoing(session, packet.url!, packet.id);

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
        // opts.timeout && req.socket.stream.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: MqttIncoming, res: MqttOutgoing): MqttContext {
        const injector = this.endpoint.injector;
        return new MqttContext(injector, req, res);
    }

}
