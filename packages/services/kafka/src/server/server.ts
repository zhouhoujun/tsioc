import { Injectable, isFunction } from '@tsdi/ioc';
import { InjectLog, Level, Logger } from '@tsdi/logger';
import { ServiceUnavailableException } from '@tsdi/common/transport';
import { Server, ServerTransportFactory, RequestContext, getRouter, ServerTransport } from '@tsdi/endpoints';
import { Kafka, LogEntry, logLevel } from 'kafkajs';
import { Subject } from 'rxjs';
import { DEFAULT_BROKERS } from '../const';
import { KafkaServConfig } from './options';
import { KafkaRequestHandler } from './handler';
import { KafkaSocket } from '../socket';



/**
 * Kafka server.
 */
@Injectable()
export class KafkaServer extends Server<RequestContext, KafkaServConfig> {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    private socket?: KafkaSocket | null;
    private _transport?: ServerTransport;

    private destroy$: Subject<void>;

    constructor(readonly handler: KafkaRequestHandler) {
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

        const consumer = client.consumer(consumeOpts);
        const producer = client.producer(options.producer);

        await consumer.connect();
        await producer.connect();
        this.socket = new KafkaSocket(consumer, producer, { ...options.runConfig });

    }


    protected async onStart(): Promise<any> {
        await this.connnect();
        if (!this.socket) throw new ServiceUnavailableException();
        const injector = this.handler.injector;
        const options = this.getOptions();

        const router = getRouter(injector, options.protocol ?? 'kafka', true);    
        if (options.content?.prefix) {
            const content = router.formatter.parseRegExp?.(`${options.content.prefix}.**`);
            if(content) {
                router.use({
                    path: '',
                    pattern: content,
                    assets: true
                })
            }
        }
        const { routes, regExps } = router.getPatterns();
        const topics = [...routes, ...regExps];

    

        const transport = this._transport = injector.get(ServerTransportFactory).create(injector, this.socket, options);

        
        await this.socket.subscribe(topics, { fromBeginning: options.fromBeginning ?? true });

        transport.handle(this.handler, this.destroy$);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            topics
        );
        router.routes.forEach(route => {
            if (route.path !== route.pattern) {
                if(route.pattern instanceof RegExp && route.pattern.source != route.path) {
                    this.logger.info('Transform pattern', route.path, 'to RegExp topic', route.pattern)
                } else {
                    this.logger.info('Transform pattern', route.pattern, 'to topic', route.path)
                }
            }
        });

    }

    protected async onShutdown(): Promise<any> {
        this._transport?.destroy();
        this.destroy$.next();
        this.destroy$.complete();
        if (this.socket) {
            await this.socket.disconnect()
        }
        this.logger.info(`Kafka microservice closed!`);
        this.socket = null;
        this.client = null;
    }


}
