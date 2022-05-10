import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class Channel {

    abstract assertQueue(queue: string, options?: AssertQueue): Promise<AssertQueueRepl>;
    abstract deleteQueue(queue: string, options?: DeleteQueue): Promise<DeleteQueueRepl>;

    abstract consume<TInput, TOutput>(queue: string, onMessage: (msg: TInput) => void, options?: Consume): Promise<TOutput>;

    abstract prefetch(count: number, global?: boolean): Promise<void>;

    abstract publish<T>(exchange: string, routingKey: string, content: T, options?: Publish): boolean;
    abstract sendToQueue(queue: string, content: Buffer, options?: Publish): boolean;

    abstract close(): Promise<void>;
}

interface AssertQueue {
    exclusive?: boolean | undefined;
    durable?: boolean | undefined;
    autoDelete?: boolean | undefined;
    arguments?: any;
    messageTtl?: number | undefined;
    expires?: number | undefined;
    deadLetterExchange?: string | undefined;
    deadLetterRoutingKey?: string | undefined;
    maxLength?: number | undefined;
    maxPriority?: number | undefined;
}
interface DeleteQueue {
    ifUnused?: boolean | undefined;
    ifEmpty?: boolean | undefined;
}

interface AssertQueueRepl {
    queue: string;
    messageCount: number;
    consumerCount: number;
}

interface DeleteQueueRepl {
    messageCount: number;
}



export interface Consume {
    consumerTag?: string;
}

export interface Consume {
    consumerTag?: string;
    noLocal?: boolean;
    noAck?: boolean;
    exclusive?: boolean;
    priority?: number;
    arguments?: any;
}

export interface Publish {
    expiration?: string | number;
    userId?: string;
    CC?: string | string[];

    mandatory?: boolean;
    persistent?: boolean;
    deliveryMode?: boolean | number;
    BCC?: string | string[];

    contentType?: string;
    contentEncoding?: string;
    headers?: any;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    messageId?: string;
    timestamp?: number;
    type?: string;
    appId?: string;
}
