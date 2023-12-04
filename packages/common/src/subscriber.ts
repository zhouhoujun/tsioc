import { IEventEmitter } from './stream';

/**
 * topic client.
 */
export interface TopicClient extends IEventEmitter {
    subscribe(topics: string | string[]): void;
    publish(topic: string, data: Buffer, callback?: (err: any, res: any) => void): void;
    publish(topic: string, data: Buffer, opts: any, callback?: (err: any, res: any) => void): void;
    unsubscribe?(topics: string | string[], callback: (err: any, res: any) => void): void
}

/**
 * Topic message.
 */
export interface TopicMessage {
    topic: string,
    payload: string | Buffer | Uint8Array
}
