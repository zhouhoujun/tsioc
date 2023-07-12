import { MESSAGE, MircoServRouters, Outgoing, Packet, PatternFormatter, Server, TransportContext, TransportSession } from '@tsdi/core';
import { Execption, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { Client, connect } from 'mqtt';
import { MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttEndpoint } from './endpoint';
import { Content, LOCALHOST, ev } from '@tsdi/transport';
import { MqttIncoming } from './incoming';
import { MqttOutgoing } from './outgoing';
import { Subscription, finalize } from 'rxjs';
import { MqttContext } from './context';
import { MqttTransportSessionFactory } from '../transport';


/**
 * Mqtt Server
 */
@Injectable()
export class MqttServer extends Server<TransportContext, Outgoing> {

    @InjectLog()
    private logger!: Logger;

    private subscribes?: string[];
    private mqtt?: Client | null;
    private _session?: TransportSession<Client>;

    constructor(
        readonly endpoint: MqttEndpoint,
        @Inject(MQTT_SERV_OPTS) private options: MqttServiceOpts
    ) {
        super();
    }

    protected override async onStartup(): Promise<any> {
        const opts = this.options.connectOpts = {
            host: LOCALHOST,
            port: 1883,
            ...this.options.connectOpts
        };
        this.mqtt = opts.url ? connect(opts.url, opts) : connect(opts);
        const defer = lang.defer();
        this.mqtt.on(ev.ERROR, (err) => this.logger.error(err));

        this.mqtt.on(ev.CONNECT, (packet) => {
            this.logger?.info('Mqtt client connected!', 'return code', packet.returnCode);
            defer.resolve();
        });

        this.mqtt.on(ev.DISCONNECT, (packet) => {
            this.logger?.info('Mqtt client disconnected!', 'reason code', packet.reasonCode);
        });

        this.mqtt.on(ev.OFFLINE, () => {
            this.logger?.info('Mqtt microservice offline!');
        });

        this.mqtt.on(ev.END, () => {
            this.logger.info(`Mqtt microservice closed!`);
        })

        await defer.promise;
    }

    protected override async onStart(): Promise<any> {
        if (!this.mqtt) throw new Execption('Mqtt connection cannot be null');

        const router = this.endpoint.injector.get(MircoServRouters).get('mqtt');
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            const content = this.endpoint.injector.get(PatternFormatter).format(`${this.options.content.prefix}/#`);
            router.matcher.register(content, true);
        }

        const subscribes = this.subscribes = router.matcher.getPatterns();

        await promisify(this.mqtt.subscribe, this.mqtt)(subscribes)
            .catch(err => {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
                throw err;
            });

        const factory = this.endpoint.injector.get(MqttTransportSessionFactory);
        const session = this._session = factory.create(this.mqtt, { ...this.options.transportOpts, serverSide: true });

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subscribes
        );
        router.matcher.eachPattern((topic, pattern) => {
            if (topic !== pattern) {
                this.logger.info('Transform pattern', pattern, 'to topic', topic)
            }
        });

    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt) return;
        this._session?.destroy();
        if (this.subscribes) await promisify(this.mqtt.unsubscribe, this.mqtt)(this.subscribes);
        await promisify(this.mqtt.end, this.mqtt)(true)
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
        // const opts = this.options;
        // opts.timeout && req.socket.stream.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: MqttIncoming, res: MqttOutgoing): MqttContext {
        const injector = this.endpoint.injector;
        return new MqttContext(injector, req, res, this.options);
    }

}
