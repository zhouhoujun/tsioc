import { Empty, Exception, Injectable, lang, promisify } from '@tsdi/ioc';
import { ev } from '@tsdi/common/transport';
import { getRouter, RequestContext, Server, ServerTransport, ServerTransportFactory } from '@tsdi/endpoints';
import { InjectLog, Logger } from '@tsdi/logger';
import { Client, connect, IClientSubscribeOptions } from 'mqtt';
import { MqttServConfig } from './options';
import { MqttRequestHandler } from './handler';
import { Subject } from 'rxjs';
import { RouteHandler } from '@tsdi/endpoints/src/router/route.handler';


/**
 * Mqtt Server
 */
@Injectable()
export class MqttServer extends Server<RequestContext, MqttServConfig> {

    @InjectLog()
    private logger!: Logger;

    private destroy$: Subject<void>;
    private subscribes?: string[];
    private mqtt?: Client | null;
    private _transport?: ServerTransport<Client>;

    constructor(
        readonly handler: MqttRequestHandler
    ) {
        super();
        this.destroy$ = new Subject();
    }

    protected async connect(): Promise<any> {

        const opts = this.getOptions().serverOpts ?? {};

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
        await this.connect();
        if (!this.mqtt) throw new Exception('Mqtt connection cannot be null');

        const options = this.getOptions();
        const injector = this.handler.injector;
        const router = getRouter(injector, options.protocol ?? 'mqtt', true);

        const { routes } = router.getPatterns();
        if (options.content?.prefix) {
            const content = router.formatter.format(`${options.content.prefix}/#`);
            routes.push(content);
        }

        this.subscribes = routes;

        await (options.subscribeOptions ? promisify<string | string[], IClientSubscribeOptions>(this.mqtt.subscribe, this.mqtt)(routes, options.subscribeOptions)
            : promisify(this.mqtt.subscribe, this.mqtt)(routes))
            .catch(err => {
                // Just like other commands, subscribe() can fail for some reasons,
                // ex network issues.
                this.logger.error("Failed to subscribe: %s", err.message);
                throw err;
            });


        const factory = injector.get(ServerTransportFactory);
        const session = this._transport = factory.create(injector, this.mqtt, options);
        session.handle(this.handler, this.destroy$);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            routes
        );

        router.routes.forEach(route => {
            if (route.path !== route.pattern) {
                this.logger.info('Transform pattern', route.pattern, 'to topic', route.path)
            }
        });

    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt) return;
        this.destroy$.next();
        this.destroy$.complete();
        this._transport?.destroy();
        if (this.subscribes?.length) await promisify(this.mqtt.unsubscribe, this.mqtt)(this.subscribes);
        await promisify(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
        this.mqtt = null;
    }

}
