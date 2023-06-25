import { Injectable, Inject, isFunction } from '@tsdi/ioc';
import { Server, Packet, MircoServRouters, ServiceUnavailableExecption, TransportSession, MESSAGE, normalize, PatternFormatter } from '@tsdi/core';
import { InjectLog, Level, Logger } from '@tsdi/logs';
import { Content, ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import { Consumer, Kafka, LogEntry, logLevel, Producer } from 'kafkajs';
import { KafkaTransportSession, KafkaTransportSessionFactory } from '../transport';
import { DEFAULT_BROKERS, KafkaHeaders, KafkaTransport } from '../const';
import { KAFKA_SERV_OPTS, KafkaServerOptions } from './options';
import { KafkaEndpoint } from './endpoint';
import { KafkaContext } from './context';
import { KafkaOutgoing } from './outgoing';
import { KafkaIncoming } from './incoming';
import { KafkaPatternFormatter } from '../pattern';





@Injectable()
export class KafkaServer extends Server<KafkaContext> {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    protected consumer?: Consumer | null;
    protected producer?: Producer | null;
    private _session?: KafkaTransportSession;

    constructor(readonly endpoint: KafkaEndpoint, @Inject(KAFKA_SERV_OPTS) private options: KafkaServerOptions) {
        super();
    }

    protected async onStartup(): Promise<any> {
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
        const clientId = (this.options.connectOpts?.clientId ?? 'boot-consumer') + postfixId;
        const groupId = (this.options.consumer?.groupId ?? 'boot-group') + postfixId;
        const connectOpts = this.options.connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            ...this.options.connectOpts,
            clientId
        }

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }

        const client: Kafka = this.client = new Kafka(connectOpts);


        const consumeOpts = this.options.consumer = {
            ...this.options.consumer,
            groupId
        };
        this.consumer = client.consumer(consumeOpts);
        this.producer = client.producer(this.options.producer);

        await this.consumer.connect();
        await this.producer.connect();
    }


    protected async onStart(): Promise<any> {
        if (!this.consumer || !this.producer) throw new ServiceUnavailableExecption();
        const consumer = this.consumer;
        const producer = this.producer;
        const router = this.endpoint.injector.get(MircoServRouters).get('kafka');
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            const content = normalize(this.endpoint.injector.get(KafkaPatternFormatter).format(`${this.options.content.prefix}/**`));
            // topics.push(new RegExp(content + '.\.*'));
            router.matcher.register(content, true);
        }
        const topics = router.matcher.getPatterns<string|RegExp>();

        const transportOpts = this.options.transportOpts = {
            ...this.options.transportOpts,
            serverSide: true
        };
        const session = this._session = this.endpoint.injector.get(KafkaTransportSessionFactory).create({ consumer, producer }, transportOpts);

        await session.bindTopics(topics);

        session.on(ev.MESSAGE, (topic: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

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
        this.consumer && (await this.consumer.disconnect());
        this.producer && (await this.producer.disconnect());
        this.consumer = null!;
        this.producer = null!;
        this.client = null!;
    }

    /**
    * request handler.
    * @param observer 
    * @param req 
    * @param res 
    */
    protected requestHandler(session: TransportSession<KafkaTransport>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new KafkaIncoming(session, packet);
        const res = new KafkaOutgoing(session, packet.topic!, packet.headers?.[KafkaHeaders.REPLY_TOPIC] as string, packet.headers?.[KafkaHeaders.REPLY_PARTITION] as string, packet.id);

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
        // opts.timeout && req.socket.consumer.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: KafkaIncoming, res: KafkaOutgoing): KafkaContext {
        const injector = this.endpoint.injector;
        return new KafkaContext(injector, req, res, this.options);
    }



}
