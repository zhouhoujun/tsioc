import { Inject, Injectable, InvocationContext, isFunction } from '@tsdi/ioc';
import { TransportEvent, TransportRequest, patternToPath } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { MircoServRouters } from '@tsdi/endpoints';
import { InjectLog, Level, Logger } from '@tsdi/logger';
import { Cluster, Consumer, ConsumerGroupJoinEvent, Kafka, LogEntry, PartitionAssigner, Producer, logLevel } from 'kafkajs';
import { KafkaHandler } from './handler';
import { KafkaClientOpts } from './options';
import { KafkaTransportSession } from '../server/kafka.session';
import { DEFAULT_BROKERS, KafkaTransportOpts } from '../const';
import { KafkaReplyPartitionAssigner } from '../kafka.assigner';
import { KafkaClientTransportSession } from './session';



@Injectable()
export class KafkaClient extends Client<TransportRequest, TransportEvent, KafkaClientOpts> {


    @InjectLog()
    private logger!: Logger;

    private client?: Kafka | null;
    private consumer?: Consumer | null;
    private producer?: Producer | null;
    private _session?: KafkaClientTransportSession;

    constructor(readonly handler: KafkaHandler) {
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

        const options = this.getOptions();

        const postfixId = options.postfixId = options.postfixId ?? '-client';

        const connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            clientId: 'boot-consumer' + postfixId,
            ...options.connectOpts
        };

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }
        this.client = new Kafka(connectOpts);

        const transportOpts = { transport: 'kafka', ...options.transportOpts } as KafkaTransportOpts;

        if (!options.producerOnlyMode) {
            const partitionAssigners = [
                (config: { cluster: Cluster }) => new KafkaReplyPartitionAssigner(transportOpts, config),
            ] as PartitionAssigner[];

            const consumeOpts = {
                partitionAssigners,
                groupId: 'boot-group' + postfixId,
                ...options.consumer
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

        this.producer = this.client.producer(options.producer);
        await this.producer.connect();
        const injector = this.handler.injector;
        this._session = injector.get(ClientTransportSessionFactory).create(injector, {
            producer: this.producer,
            consumer: this.consumer!
        }, transportOpts) as KafkaClientTransportSession

        if (!options.producerOnlyMode) {
            const topics = options.topics ? options.topics.map(t => {
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
        context.setValue(ClientTransportSession, this._session)
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

