import { Abstract } from '@tsdi/ioc';




/**
 * base message.
 */
export abstract class Message<T = any> {
    abstract get id(): string | number | null;
    abstract get headers(): Record<string, any> | null;
    abstract get data(): T;
}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create(data: any, options?: { id?: string| number, headers?: Record<string, any> }): Message;
    abstract create<T = any>(data: T, options?: { id?: string| number, headers?: Record<string, any> }): Message<T>;
}
