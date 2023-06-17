import { Inject, Injectable, InvocationContext, isFunction } from '@tsdi/ioc';
import { Client } from '@tsdi/core';
import { InjectLog, Level, Logger } from '@tsdi/logs';
import { Cluster, Consumer, ConsumerGroupJoinEvent, Kafka, LogEntry, PartitionAssigner, Producer, logLevel } from 'kafkajs';
import { KafkaHandler } from './handler';
import { KAFKA_CLIENT_OPTS, KafkaClientOpts } from './options';
import { KafkaReplyPartitionAssigner } from '../transport';
import { DEFAULT_BROKERS, KAFKA_TRANSPORT } from '../const';



@Injectable({ static: false })
export class KafkaClient extends Client {


    @InjectLog()
    private logger!: Logger;

    private client?: Kafka | null;
    private consumer?: Consumer | null;
    private producer?: Producer | null;
    private consumerAssignments: { [key: string]: number } = {};

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
        const clientId = (this.options.connectOpts?.clientId ?? 'boot-consumer') + postfixId;
        const groupId = (this.options.consumer?.groupId ?? 'boot-group') + postfixId;

        const connectOpts = this.options.connectOpts = {
            brokers: DEFAULT_BROKERS,
            logCreator,
            ...this.options.connectOpts,
            clientId
        };

        if (isFunction(connectOpts.brokers)) {
            connectOpts.brokers = await connectOpts.brokers();
        }
        this.client = new Kafka(connectOpts);


        if (!this.options.producerOnlyMode) {
            const partitionAssigners = [
                (config: { cluster: Cluster }) => new KafkaReplyPartitionAssigner(this.getConsumerAssignments.bind(this), config),
            ] as PartitionAssigner[];

            this.options.consumer = {
                partitionAssigners,
                ...this.options.consumer,
                groupId
            }
            this.consumer = this.client.consumer(this.options.consumer);

            this.consumer.on(
                this.consumer.events.GROUP_JOIN,
                (data: ConsumerGroupJoinEvent) => {
                    const consumerAssignments: { [key: string]: number } = {};
                    // only need to set the minimum
                    Object.keys(data.payload.memberAssignment).forEach(memberId => {
                        const minimumPartition = Math.min(
                            ...data.payload.memberAssignment[memberId],
                        );
                        consumerAssignments[memberId] = minimumPartition;
                    });
                    this.consumerAssignments = consumerAssignments;
                });

            await this.consumer.connect();
        }

        this.producer = this.client.producer(this.options.producer);
        await this.producer.connect();

    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(KAFKA_TRANSPORT, {
            producer: this.producer,
            consumer: this.consumer
        })
    }

    protected async onShutdown(): Promise<void> {
        await this.producer?.disconnect();
        await this.consumer?.disconnect();
        this.producer = null;
        this.consumer = null;
        this.client = null;
    }

    public getConsumerAssignments() {
        return this.consumerAssignments;
    }


}

