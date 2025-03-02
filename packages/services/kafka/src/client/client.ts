import { Injectable, isFunction, isString } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { InjectLog, Level, Logger } from '@tsdi/logger';
import { Pattern, RequestInitOpts, ResponseEvent, TopicRequestOptions, patternToPath } from '@tsdi/common';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { getRouter } from '@tsdi/endpoints';
import { Cluster, Consumer, ConsumerGroupJoinEvent, Kafka, LogEntry, PartitionAssigner, logLevel } from 'kafkajs';
import { KafkaHandler } from './handler';
import { KafkaClientConfig } from './options';
import { DEFAULT_BROKERS } from '../const';
import { KafkaReplyPartitionAssigner } from '../kafka.assigner';
import { KafkaRequest } from './request';
import { KafkaSocket } from '../socket';



@Injectable()
export class KafkaClient extends AbstractClient<TopicRequestOptions, KafkaRequest<any>, ResponseEvent<any>, KafkaClientConfig> {

    @InjectLog()
    private logger!: Logger;

    private client?: Kafka | null;
    private socket?: KafkaSocket | null;
    private _transport?: ClientTransport;

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

        if (!options.consumerAssignments) {
            options.consumerAssignments = {};
        }

        let consumer: Consumer | null = null;
        if (!options.producerOnlyMode) {
            const partitionAssigners = [
                (config: { cluster: Cluster }) => new KafkaReplyPartitionAssigner(options.consumerAssignments!, config),
            ] as PartitionAssigner[];

            const consumeOpts = {
                partitionAssigners,
                groupId: 'boot-group' + postfixId,
                ...options.consumer
            };


            consumer = this.client.consumer(consumeOpts);

            consumer.on(
                consumer.events.GROUP_JOIN,
                (data: ConsumerGroupJoinEvent) => {
                    const consumerAssignments = options.consumerAssignments!;
                    Object.keys(data.payload.memberAssignment).forEach(memberId => {
                        const minimumPartition = Math.min(
                            ...data.payload.memberAssignment[memberId],
                        );
                        consumerAssignments[memberId] = minimumPartition;
                    });
                });

            await consumer.connect();
        }

        const producer = this.client.producer(options.producer);
        await producer.connect();

        if (!options.runConfig) {
            options.runConfig = {};
        }
        this.socket = new KafkaSocket(consumer, producer, options.runConfig);
        const injector = this.handler.injector;
        this._transport = injector.get(ClientTransportFactory).create(injector, this.socket, options);

        if (!options.producerOnlyMode) {
            const topics = options.topics ? options.topics.map(t => {
                if (t instanceof RegExp) return t;
                return this.formatter.format(t);
            }) : getRouter(injector, options.protocol ?? 'kafka', true).matcher.getPatterns();

            const reply$ = topics.map(t => this.getReplyTopic(t));
            console.log(reply$);
            await this.socket.subscribe(reply$, options)
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

    protected override initContext(context: Context): void {
        context.set(ClientTransport, this._transport)
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, TopicRequestOptions>): KafkaRequest<any> {
        return new KafkaRequest(this.formatter.format(pattern), pattern, options);
    }


    protected async onShutdown(): Promise<void> {
        this.socket?.disconnect();
        this._transport?.destroy();
        this.socket = null;
        this.client = null;
    }

}

