import { Inject, Injectable, isNil, ModuleLoader, OperationFactoryResolver, Injector, getClass } from '@tsdi/ioc';
import { TransportServer, Deserializer, Serializer, TransportHandler, TransportRouter, ResponsePacket } from '@tsdi/core';
import { Level } from '@tsdi/logs';
import { Observable } from 'rxjs';

import {
    BrokersFunction, Consumer, ConsumerConfig, ConsumerRunConfig, KafkaParser, DEFAULT_BROKERS,
    ConsumerSubscribeTopic, EachMessagePayload, Kafka, KafkaConfig, KafkaHeaders, KafkaMessage,
    KafkaRequestSerializer, KafkaResponseDeserializer, LogEntry, logLevel, Message, Producer,
    ProducerConfig, ProducerRecord, RecordMetadata
} from './kafka.transform';

let kafkajs: any;

@Injectable({
    providers: [
        { provide: Serializer, useClass: KafkaRequestSerializer },
        { provide: Deserializer, useClass: KafkaResponseDeserializer }
    ]
})
export class KafkaServer extends TransportServer {

    protected client: Kafka | undefined;
    protected consumer!: Consumer;
    protected producer!: Producer;
    protected parser: KafkaParser;

    protected brokers: string[] | BrokersFunction;
    protected clientId: string;
    protected groupId: string;

    constructor(
        router: TransportRouter,
        private injector: Injector,
        private options: {
            postfixId?: string;
            client?: KafkaConfig;
            consumer?: ConsumerConfig;
            run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
            subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
            producer?: ProducerConfig;
            send?: Omit<ProducerRecord, 'topic' | 'messages'>;
            keepBinary?: boolean;
        }) {
        super(router)
        this.brokers = options.client?.brokers ?? DEFAULT_BROKERS;
        const postfixId = this.options.postfixId ?? '-server';
        this.clientId = (options.client?.clientId ?? 'boot-consumer') + postfixId;
        this.groupId = (options.consumer?.groupId ?? 'boot-group') + postfixId;
        this.parser = new KafkaParser(options.keepBinary);
    }

    async startup(): Promise<void> {
        if (!kafkajs) {
            kafkajs = await this.injector.getLoader().require('kafkajs');
        }

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

        const client: Kafka = this.client = new kafkajs.Kafka({
            ...this.options.client,
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
        await this.bindEvents(this.consumer);

    }

    public async bindEvents(consumer: Consumer) {
        const registeredPatterns = [...this.router.keys()];
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
        message: ResponsePacket,
        topic: string,
        replyPartition: string,
        correlationId: string,
    ): Promise<RecordMetadata[]> {
        const response = this.serializer.serialize(message.response);
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
        outgoingResponse: ResponsePacket,
        outgoingMessage: Message,
    ) {
        if (!outgoingResponse.disposed || !outgoingMessage.headers) {
            return;
        }
        outgoingMessage.headers[KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
    }

    public assignErrorHeader(
        outgoingResponse: ResponsePacket,
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
