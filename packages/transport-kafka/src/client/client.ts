import { Inject, Injectable, InvocationContext, isFunction } from '@tsdi/ioc';
import { Client, MircoServRouters, StatusVaildator, TRANSPORT_SESSION } from '@tsdi/transport';
import { patternToPath } from '@tsdi/common';
import { InjectLog, Level, Logger } from '@tsdi/logs';
import { Cluster, Consumer, ConsumerGroupJoinEvent, Kafka, LogEntry, PartitionAssigner, Producer, logLevel } from 'kafkajs';
import { KafkaHandler } from './handler';
import { KAFKA_CLIENT_OPTS, KafkaClientOpts } from './options';
import { KafkaReplyPartitionAssigner, KafkaTransportSession, KafkaTransportSessionFactory } from '../transport';
import { DEFAULT_BROKERS } from '../const';



@Injectable({ static: false })
export class KafkaClient extends Client {


    @InjectLog()
    private logger!: Logger;

    private client?: Kafka | null;
    private consumer?: Consumer | null;
    private producer?: Producer | null;
    private _session?: KafkaTransportSession;

    constructor(
        readonly handler: KafkaHandler,
        @Inject(KAFKA_CLIENT_OPTS) private options: KafkaClientOpts) {
        super()
    }

    private connected?: Promise<void>;
    protected connect(): Promise<void> {
        if (this.connected) return this.connected;
        return this.connected = this.connecting();
    }

    protected async connecting(): Promise<void> {
        const logCreator = (level: any) => ({ namespace, level, label, log }: LogEntry) => {
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


        const postfixId = this.options.postfixId = this.options.postfixId ?? '-client';

        const connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            clientId: 'boot-consumer' + postfixId,
            ...this.options.connectOpts
        };

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }
        this.client = new Kafka(connectOpts);

        const transportOpts = { ...this.options.transportOpts };

        if (!this.options.producerOnlyMode) {
            const partitionAssigners = [
                (config: { cluster: Cluster }) => new KafkaReplyPartitionAssigner(transportOpts, config),
            ] as PartitionAssigner[];

            const consumeOpts = {
                partitionAssigners,
                groupId: 'boot-group' + postfixId,
                ...this.options.consumer
            };


            this.consumer = this.client.consumer(consumeOpts);

            this.consumer.on(
                this.consumer.events.GROUP_JOIN,
                (data: ConsumerGroupJoinEvent) => {
                    const consumerAssignments: Record<string, number> = {};
                    Object.keys(data.payload.memberAssignment).forEach(memberId => {
                        const minimumPartition = Math.min(
                            ...data.payload.memberAssignment[memberId],
                        );
                        consumerAssignments[memberId] = minimumPartition;
                    });
                    transportOpts.consumerAssignments = consumerAssignments;
                });

            await this.consumer.connect();
        }

        this.producer = this.client.producer(this.options.producer);
        await this.producer.connect();

        const vaildator = this.handler.injector.get(StatusVaildator);
        this._session = this.handler.injector.get(KafkaTransportSessionFactory).create({
            producer: this.producer,
            vaildator,
            consumer: this.consumer!
        }, transportOpts);

        if (!this.options.producerOnlyMode) {
            const topics = this.options.topics ? this.options.topics.map(t => {
                if (t instanceof RegExp) return t;
                return patternToPath(t);
            }) : this.handler.injector.get(MircoServRouters).get('kafka').matcher.getPatterns();
            await this._session.bindTopics(topics.map(t => this.getReplyTopic(t)))
        }

    }

    protected getReplyTopic(topic: string | RegExp): string | RegExp {
        if (topic instanceof RegExp) {
            let source = topic.source;
            if (topic.source.endsWith('$')) {
                source = source.slice(0, source.length - 1) + '\\.reply' + '$'
            } else {
                source = source + '\\.reply'
            }
            return new RegExp(source);
        }
        return topic + '.reply'
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session)
    }

    protected async onShutdown(): Promise<void> {
        if (this.producer) {
            await this.producer.disconnect();
        }
        this._session?.destroy();
        if (this.consumer) {
            await this.consumer.disconnect()
        }
        this.producer = null;
        this.consumer = null;
        this.client = null;
    }

}

