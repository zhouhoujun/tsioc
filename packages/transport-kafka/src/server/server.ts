import { Injectable, Inject } from '@tsdi/ioc';
import { Server, Packet, MircoServiceRouter, ServiceUnavailableExecption, TransportSessionFactory, TransportSession, MESSAGE } from '@tsdi/core';
import { InjectLog, Level, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import { BrokersFunction, Consumer, Kafka, LogEntry, logLevel, Producer } from 'kafkajs';
import { DEFAULT_BROKERS, KafkaTransport } from '../const';
import { KAFKA_SERV_OPTS, KafkaServerOptions } from './options';
import { KafkaEndpoint } from './endpoint';
import { KafkaContext } from './context';
import { KafkaTransportOpts, KafkaTransportSession } from '../transport';
import { KafkaOutgoing } from './outgoing';
import { KafkaIncoming } from './incoming';





@Injectable()
export class KafkaServer extends Server<KafkaContext> {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    protected consumer?: Consumer | null;
    protected producer?: Producer | null;

    protected clientId: string;
    protected groupId: string;

    constructor(readonly endpoint: KafkaEndpoint, @Inject(KAFKA_SERV_OPTS) private options: KafkaServerOptions) {
        super();
        const postfixId = this.options.postfixId ?? '-server';
        this.clientId = (options.connectOpts?.clientId ?? 'boot-consumer') + postfixId;
        this.groupId = (options.consumer?.groupId ?? 'boot-group') + postfixId;
    }

    protected async onStartup(): Promise<any> {
        const clientId = this.clientId;
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


        const client: Kafka = this.client = new Kafka({
            brokers: DEFAULT_BROKERS,
            logCreator,
            ...this.options.connectOpts,
            clientId
        });

        const groupId = this.groupId;
        this.consumer = client.consumer({
            ...this.options.consumer,
            groupId
        });
        this.producer = client.producer(this.options.producer);

        await this.consumer.connect();
        await this.producer.connect();
    }


    protected async onStart(): Promise<any> {
        if (!this.consumer || !this.producer) throw new ServiceUnavailableExecption();
        const consumer = this.consumer;
        const producer = this.producer;
        const router = this.endpoint.injector.get(MircoServiceRouter).get('kafka');
        const topics = [...router.patterns.values()];

        const session = this.endpoint.injector.get(TransportSessionFactory).create({ consumer, producer }, {
            ...this.options.transportOpts
        } as KafkaTransportOpts) as KafkaTransportSession;

        await session.bindTopics(topics);

        session.on(ev.MESSAGE, (topic: string, packet: Packet) => {
            this.requestHandler(session, packet)
        })

    }

    protected async onShutdown(): Promise<any> {
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
        const res = new KafkaOutgoing(session, packet.url!, packet.id);

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
        return new KafkaContext(injector, req, res);
    }



}
