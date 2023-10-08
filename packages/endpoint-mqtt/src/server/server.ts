import { EMPTY_OBJ, Execption, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { PatternFormatter, TransportSessionFactory, TransportSession, LOCALHOST, ev } from '@tsdi/common';
import { ENDPOINTS, ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, MircoServRouters, RequestHandler, Server, TopicTransportSessionFactory, defaultMaxSize } from '@tsdi/endpoints';
import { Content } from '@tsdi/endpoints/assets';
import { InjectLog, Logger } from '@tsdi/logger';
import { Client, connect } from 'mqtt';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttEndpoint } from './endpoint';
import { Subscription } from 'rxjs';


/**
 * Mqtt Server
 */
@Injectable()
export class MqttServer extends Server {

    @InjectLog()
    private logger!: Logger;
    private subs: Subscription;

    private subscribes?: string[];
    private mqtt?: Client | null;
    private _session?: TransportSession<Client>;

    constructor(
        readonly endpoint: MqttEndpoint,
        @Inject(MQTT_SERV_OPTS) private options: MqttServiceOpts
    ) {
        super();
        this.subs = new Subscription();
    }

    protected override async onStartup(): Promise<any> {

        const opts = this.options.serverOpts ?? EMPTY_OBJ;

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
        const injector = this.endpoint.injector;
        const router = injector.get(MircoServRouters).get('mqtt');
        if (this.options.content?.prefix && this.options.interceptors && this.options.interceptors.indexOf(Content) >= 0) {
            const content = injector.get(PatternFormatter).format(`${this.options.content.prefix}/#`);
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


        const factory = injector.get(TransportSessionFactory);
        const session = this._session = factory.create(this.mqtt, 'mqtt', this.options.transportOpts);

        this.subs.add(injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options));

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

}

const defaultOpts = {
    encoding: 'utf8',
    transportOpts: {
        serverSide: true,
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    serverOpts: {
        host: LOCALHOST,
        port: 1883
    },
    detailError: true,
    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    filtersToken: MQTT_SERV_FILTERS,
    guardsToken: MQTT_SERV_GUARDS,
    sessionFactory: TopicTransportSessionFactory,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        FinalizeFilter
    ]
} as MqttServiceOpts;

ENDPOINTS.registerMicroservice('mqtt', {
    serverType: MqttServer,
    serverOptsToken: MQTT_SERV_OPTS,
    endpointType: MqttEndpoint,
    defaultOpts
});