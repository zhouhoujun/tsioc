import { Injectable, isNil, getClass, Inject } from '@tsdi/ioc';
import { Server, Packet, TransportContext, TransportEndpointOptions, MircoServiceRouter, ServiceUnavailableExecption } from '@tsdi/core';
import { InjectLog, Level, Logger } from '@tsdi/logs';
import { BrokersFunction, Cluster, Consumer, ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopic, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, Kafka, KafkaConfig, KafkaMessage, LogEntry, logLevel, MemberMetadata, PartitionAssigner, Producer, ProducerConfig, ProducerRecord, RecordMetadata } from 'kafkajs';
import { DEFAULT_BROKERS, KafkaHeaders } from '../const';
import { KafkaParser } from '../parser';
import { KAFKA_SERV_OPTS, KafkaServerOptions } from './options';
import { KafkaEndpoint } from './endpoint';
import { KafkaContext } from './context';





@Injectable()
export class KafkaServer extends Server<KafkaContext> {

    @InjectLog()
    private logger!: Logger;

    protected client?: Kafka | null;
    protected consumer?: Consumer | null;
    protected producer?: Producer | null;

    protected brokers: string[] | BrokersFunction;
    protected clientId: string;
    protected groupId: string;

    constructor(readonly endpoint: KafkaEndpoint, @Inject(KAFKA_SERV_OPTS) private options: KafkaServerOptions) {
        super();
        this.brokers = options.connectOpts?.brokers ?? DEFAULT_BROKERS;
        const postfixId = this.options.postfixId ?? '-server';
        this.clientId = (options.connectOpts?.clientId ?? 'boot-consumer') + postfixId;
        this.groupId = (options.consumer?.groupId ?? 'boot-group') + postfixId;
    }

    protected initOption(options: KafkaServerOptions): KafkaServerOptions {
        this.options = options;
        this.brokers = options.connectOpts?.brokers ?? DEFAULT_BROKERS;
        const postfixId = this.options.postfixId ?? '-server';
        this.clientId = (options.connectOpts?.clientId ?? 'boot-consumer') + postfixId;
        this.groupId = (options.consumer?.groupId ?? 'boot-group') + postfixId;
        return this.options;
    }

    protected async onStartup(): Promise<any> {
        const brokers = this.brokers;
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
            ...this.options.connectOpts,
            brokers,
            clientId,
            logCreator
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
        if(!this.consumer || !this.producer) throw new ServiceUnavailableExecption();
        const consumer = this.consumer;
        const router = this.endpoint.injector.get(MircoServiceRouter).get('kafka');
        const registeredPatterns = [...router.patterns.values()];
        const consumerSubscribeOptions = this.options.subscribe || {};
        const subscribeToPattern = async (pattern: string) =>
            consumer.subscribe({
                topic: pattern,
                ...consumerSubscribeOptions,
            });
        await Promise.all(registeredPatterns.map(subscribeToPattern));

        await consumer.run({
            ...this.options.run,
            eachMessage: (payload: EachMessagePayload) => this.handleMessage(payload)
        });
    }


    protected async onShutdown(): Promise<any> {
        await this.consumer?.disconnect();
        await this.producer?.disconnect();
        this.consumer = null;
        this.producer = null;
        this.client = null;
    }



    public async handleMessage(payload: EachMessagePayload) {
        const { topic, partition } = payload;
        const rawMessage = this.parser.parse<KafkaMessage>({
            ...payload.message,
            topic,
            partition,
        });
        const headers = rawMessage.headers as unknown as Record<string, any>;
        const correlationId = headers[KafkaHeaders.CORRELATION_ID];
        const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
        const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];

        const packet = await this.deserializer.deserialize(rawMessage);
        const kafkaContext = this.injector.get(OperationFactoryResolver)
            .resolve(getClass(this), this.injector)
            .createContext({
                arguments: packet
            });
        // if the correlation id or reply topic is not set
        // then this is an event (events could still have correlation id)
        if (!correlationId || !replyTopic) {
            return this.handleEvent(kafkaContext);
        }

        const publish = this.getPublisher(
            replyTopic,
            replyPartition,
            correlationId,
        );

        // const handler = this.handlers.getHandlerByPattern(packet.pattern);
        // if (!handler) {
        //     return publish({
        //         id: correlationId,
        //         err: `There is no matching message handler defined in the remote service.`,
        //     });
        // }

        const response = this.router.handle(kafkaContext);
        response && this.send(response, publish);
    }

    public sendMessage(
        message: Packet,
        topic: string,
        replyPartition: string,
        correlationId: string,
    ): Promise<RecordMetadata[]> {
        const response = this.serializer.serialize(message.payload);
        this.assignReplyPartition(replyPartition, response);
        this.assignCorrelationIdHeader(correlationId, response);
        this.assignErrorHeader(message, response);
        this.assigndisposedHeader(message, response);
        const messages = [response];

        return this.producer.send({
            topic,
            messages,
            ...this.options.send
        });
    }


    public assigndisposedHeader(
        outgoingResponse: Packet,
        outgoingMessage: Message,
    ) {
        if (!outgoingResponse.disposed || !outgoingMessage.headers) {
            return;
        }
        outgoingMessage.headers[KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
    }

    public assignErrorHeader(
        outgoingResponse: Packet,
        outgoingMessage: Message,
    ) {
        if (!outgoingResponse.err || !outgoingMessage.headers) {
            return;
        }
        outgoingMessage.headers[KafkaHeaders.NEST_ERR] = Buffer.from(
            outgoingResponse.err,
        );
    }

    public assignCorrelationIdHeader(
        correlationId: string,
        outgoingMessage: Message,
    ) {
        if (!outgoingMessage.headers) return;
        outgoingMessage.headers[KafkaHeaders.CORRELATION_ID] =
            Buffer.from(correlationId);
    }

    public assignReplyPartition(
        replyPartition: string,
        outgoingMessage: Message,
    ) {
        if (isNil(replyPartition)) {
            return;
        }
        outgoingMessage.partition = parseFloat(replyPartition);
    }

    public getPublisher(
        replyTopic: string,
        replyPartition: string,
        correlationId: string,
    ): (data: any) => Promise<RecordMetadata[]> {
        return (data: any) =>
            this.sendMessage(data, replyTopic, replyPartition, correlationId);
    }

    async onDispose(): Promise<void> {
        this.consumer && (await this.consumer.disconnect());
        this.producer && (await this.producer.disconnect());
        this.consumer = null!;
        this.producer = null!;
        this.client = null!;
    }

}
