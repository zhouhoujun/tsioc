import { Abstract } from '@tsdi/ioc';




/**
 * base message.
 */
export abstract class Message<T = any> {
    abstract get headers(): Record<string, any> | null;
    abstract get data(): T;
}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create<T>(data: T, options?: { headers?: Record<string, any> }): Message<T>
}
