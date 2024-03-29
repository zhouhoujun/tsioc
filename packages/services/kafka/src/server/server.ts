import { Injectable, Inject, isFunction } from '@tsdi/ioc';
import { InjectLog, Level, Logger } from '@tsdi/logger';
import { PatternFormatter } from '@tsdi/common';
import { Server, MircoServRouters, RequestHandler, TransportSessionFactory, RequestContext, EndpointHandler, ServerOpts } from '@tsdi/endpoints';
import { Consumer, Kafka, LogEntry, logLevel, Producer } from 'kafkajs';
import { KafkaTransportSession } from './kafka.session';
import { DEFAULT_BROKERS, KafkaTransportOpts } from '../const';
import { KafkaServerOptions } from './options';
import { KafkaEndpointHandler } from './handler';
import { ServiceUnavailableExecption } from '@tsdi/common/transport';
import { Subject, fromEvent, merge } from 'rxjs';



/**
 * Kafka server.
 */
@Injectable()
export class KafkaServer extends Server<RequestContext, KafkaServerOptions> {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    protected consumer?: Consumer | null;
    protected producer?: Producer | null;
    private _session?: KafkaTransportSession;

    private destroy$: Subject<void>;

    constructor(readonly handler: KafkaEndpointHandler) {
        super();
        this.destroy$ = new Subject();
    }

    protected async connnect(): Promise<any> {
        const options = this.getOptions();

        const logCreator = (level: any) =>
            ({ namespace, level, label, log }: LogEntry) => {
                let loggerMethod: Level;

                switch (level) {
                    case logLevel.ERROR:
                    case logLevel.NOTHING:
                        loggerMethod = 'error';
                        break;
                    case logLevel.WARN:
                        loggerMethod = 'warn';
                        break;
                    case logLevel.INFO:
                        loggerMethod = 'log';
                        break;
                    case logLevel.DEBUG:
                    default:
                        loggerMethod = 'debug';
                        break;
                }

                const { message, ...others } = log;
                if (this.logger[loggerMethod]) {
                    this.logger[loggerMethod](
                        `${label} [${namespace}] ${message} ${JSON.stringify(others)}`,
                    );
                }
            };


        const postfixId = options.postfixId ?? '-server';
        const connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            clientId: 'boot-consumer' + postfixId,
            ...options.serverOpts
        };

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }

        const client: Kafka = this.client = new Kafka(connectOpts);


        const consumeOpts = {
            groupId: 'boot-group' + postfixId,
            ...options.consumer,
        };


        this.consumer = client.consumer(consumeOpts);
        this.producer = client.producer(options.producer);

        await this.consumer.connect();
        await this.producer.connect();
    }


    protected async onStart(): Promise<any> {
        await this.connnect();
        if (!this.consumer || !this.producer) throw new ServiceUnavailableExecption();
        const consumer = this.consumer;
        const producer = this.producer;
        const injector = this.handler.injector;
        const options = this.getOptions();

        const router = injector.get(MircoServRouters).get('kafka');
        if (options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${options.content.prefix}-**`);
            router.matcher.register(content, true);
        }
        const topics = router.matcher.getPatterns<string | RegExp>();

        const transportOpts = options.transportOpts = {
            transport: 'kafka',
            ...options.transportOpts,
            serverSide: true
        } as KafkaTransportOpts;

        const session = this._session = injector.get(TransportSessionFactory).create(injector, { consumer, producer }, transportOpts) as KafkaTransportSession;

        await session.bindTopics(topics);

        session.listen(this.handler, this.destroy$);
        // injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            topics
        );
        router.matcher.eachPattern((topic, pattern) => {
            if (topic !== pattern) {
                this.logger.info('Transform pattern', pattern, 'to topic', topic)
            }
        });

    }

    protected async onShutdown(): Promise<any> {
        this._session?.destroy();
        this.destroy$.next();
        this.destroy$.complete();
        if (this.consumer) {
            await this.consumer.disconnect()
        }
        if (this.producer) {
            await this.producer.disconnect();
        }

        this.logger.info(`Kafka microservice closed!`);
        this.consumer = null!;
        this.producer = null!;
        this.client = null!;
    }


}
