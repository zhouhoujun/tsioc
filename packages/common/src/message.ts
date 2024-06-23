import { Abstract } from '@tsdi/ioc';
import { IReadableStream } from '../transport';
import { Header } from './headers';
import { Pattern } from './pattern';


export interface MessageInitOpts {
    id?: string | number;
    headers?: Record<string, any>;
    data?: Buffer | IReadableStream | null;
}


/**
 * base message.
 */
export class Message {
    public id: string | number | undefined;

    readonly headers: Record<string, Header>;

    public data: Buffer | IReadableStream | null;

    public streamLength?: number;

    public noHead?: boolean;

    constructor(init: {
        id?: string | number;
        headers?: Record<string, any>;
        data?: Buffer | IReadableStream | null;
        streamLength?: number;
    }) {
        this.id = init.id;
        this.data = init.data ?? null;
        this.streamLength = init.streamLength;
        this.headers = init.headers ?? {};
    }
}


export class PatternMesage extends Message {
    readonly pattern: Pattern
    constructor(init: {
        id?: string | number;
        pattern?: Pattern;
        headers?: Record<string, any>;
        data?: Buffer | IReadableStream | null;
        streamLength?: number;
    }) {
        super(init)
        this.pattern = init.pattern!
    }

}

/**
 * Message factory
 */
@Abstract()
export abstract class MessageFactory {
    abstract create(initOpts: {
        id?: string | number;
        headers?: Record<string, any>;
        data?: Buffer | IReadableStream | null;
        streamLength?: number;
    }): Message;
    abstract create<T = any>(initOpts: {
        id?: string | number;
        headers?: Record<string, any>;
        data?: T;
        streamLength?: number;
    }): Message;
}
