import { ListenOpts, MESSAGE, MicroService, Outgoing, Packet, Router, TransportContext, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Execption, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { MqttClient, connect } from 'mqtt';
import { MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttEndpoint } from './endpoint';
import { Content, LOCALHOST, ev } from '@tsdi/transport';
import { MqttIncoming } from './incoming';
import { MqttOutgoing } from './outgoing';
import { Subscription, finalize } from 'rxjs';
import { MqttContext } from './context';



@Injectable()
export class MqttServer extends MicroService<TransportContext, Outgoing> {

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly endpoint: MqttEndpoint,
        @Inject(MQTT_SERV_OPTS) private options: MqttServiceOpts) {
        super();
    }

    private mqtt?: MqttClient;
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

    protected toPatterns(patterns: string[]): string[] {
        const dotp = /.\*/g;
        const restp = /\/:\w+/g;
        const msgp = /\/\*/g;
        const msgmp = /\/\*\*$/;
        return patterns.map(p => p.replace(dotp, '/+')
            .replace(restp, '/+')
            .replace(msgp, '/+')
            .replace(msgmp, '/#'))
    }

    protected override async onStart(): Promise<any> {
        if (!this.mqtt) throw new Execption('Mqtt connection cannot be null');

        const router = this.endpoint.injector.get(Router);
        const subscribes = Array.from(router.subscribes.values());
        const psubscribes = this.toPatterns(subscribes);
        if (this.options.interceptors!.indexOf(Content) >= 0) {
            subscribes.push('#.+');
        }

        await promisify(this.mqtt.subscribe, this.mqtt)(psubscribes)
            .catch(err => {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
                throw err;
            });

        const factory = this.endpoint.injector.get(TransportSessionFactory);
        const session = factory.create(this.mqtt, this.options.transportOpts);

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            psubscribes,
            '\norigin patterns\n',
            subscribes
        );

    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt) return;
        // this.mqtt.end();
        await promisify<void, boolean | undefined>(this.mqtt.end, this.mqtt)(true)
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
    protected requestHandler(session: TransportSession<MqttClient>, packet: Packet): Subscription {
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
