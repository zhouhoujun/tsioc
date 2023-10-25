import { Injectable, Inject, isFunction } from '@tsdi/ioc';
import { InjectLog, Level, Logger } from '@tsdi/logger';
import { PatternFormatter, ServiceUnavailableExecption, TransportSessionFactory } from '@tsdi/common';
import { Server, MircoServRouters, StatusVaildator, RequestHandler } from '@tsdi/endpoints';
import { Consumer, Kafka, LogEntry, logLevel, Producer } from 'kafkajs';
import { KafkaTransportSession } from '../kafka.session';
import { DEFAULT_BROKERS, KafkaTransportOpts } from '../const';
import { KAFKA_SERV_OPTS, KafkaServerOptions } from './options';
import { KafkaEndpoint } from './endpoint';



/**
 * Kafka server.
 */
@Injectable()
export class KafkaServer extends Server {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    protected consumer?: Consumer | null;
    protected producer?: Producer | null;
    private _session?: KafkaTransportSession;

    constructor(readonly endpoint: KafkaEndpoint, @Inject(KAFKA_SERV_OPTS) private options: KafkaServerOptions) {
        super();
    }

    protected async connnect(): Promise<any> {
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


        const postfixId = this.options.postfixId ?? '-server';
        const connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            clientId: 'boot-consumer' + postfixId,
            ...this.options.serverOpts
        };

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }

        const client: Kafka = this.client = new Kafka(connectOpts);


        const consumeOpts = {
            groupId: 'boot-group' + postfixId,
            ...this.options.consumer,
        };


        this.consumer = client.consumer(consumeOpts);
        this.producer = client.producer(this.options.producer);

        await this.consumer.connect();
        await this.producer.connect();
    }


    protected async onStart(): Promise<any> {
        await this.connnect();
        if (!this.consumer || !this.producer) throw new ServiceUnavailableExecption();
        const consumer = this.consumer;
        const producer = this.producer;
        const injector = this.endpoint.injector;
        const router = injector.get(MircoServRouters).get('kafka');
        if (this.options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${this.options.content.prefix}-**`);
            router.matcher.register(content, true);
        }
        const topics = router.matcher.getPatterns<string | RegExp>();

        const transportOpts = this.options.transportOpts = {
            transport: 'kafka',
            ...this.options.transportOpts,
            serverSide: true
        } as KafkaTransportOpts;

        const vaildator = injector.get(StatusVaildator, null);
        const session = this._session = injector.get(TransportSessionFactory).create({ consumer, vaildator, producer }, transportOpts) as KafkaTransportSession;

        await session.bindTopics(topics);

        injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

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
