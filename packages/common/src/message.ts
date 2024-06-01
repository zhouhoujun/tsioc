import { Abstract } from '@tsdi/ioc';
import { IReadableStream } from '../transport';
import { HeadersLike } from './headers';




/**
 * base message.
 */
export abstract class Message {
    abstract get id(): string | number | null;
    abstract get headers(): Record<string, any>;
    abstract get data(): Buffer | IReadableStream;

    abstract clone(update: {
        headers?: HeadersLike;
        data?: Buffer | IReadableStream | null;
        setHeaders?: { [name: string]: string | string[]; };
    }): this;

    abstract attachId(id: string | number): void;
}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create(data: any, options?: { id?: string | number, headers?: Record<string, any> }): Message;
    abstract create<T = any>(data: T, options?: { id?: string | number, headers?: Record<string, any> }): Message;
}
