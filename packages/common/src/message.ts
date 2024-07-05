import { Abstract } from '@tsdi/ioc';
import { IReadableStream } from '../transport';
import { Header } from './headers';
import { Pattern } from './pattern';


export interface MessageInitOpts {
    id?: string | number;
    headers?: Record<string, any>;
    data?: Buffer | IReadableStream | null;
}

export abstract class Message {

    id: string | number | undefined;

    streamLength?: number;
    
    noHead?: boolean;

    abstract get headers(): Record<string, Header>;

    abstract get data(): string | Buffer | IReadableStream | null;

    abstract set data(value: string | Buffer | IReadableStream | null);
}


/**
 * base message.
 */
export class BaseMessage implements Message {
    public id: string | number | undefined;

    readonly headers: Record<string, Header>;

    public data: string | Buffer | IReadableStream | null;

    public streamLength?: number;

    public noHead?: boolean;

    constructor(init: {
        id?: string | number;
        headers?: Record<string, any>;
        data?: string | Buffer | IReadableStream | null;
        streamLength?: number;
    }) {
        this.id = init.id;
        this.data = init.data ?? null;
        this.streamLength = init.streamLength;
        this.headers = init.headers ?? {};
    }
}


export class PatternMesage extends BaseMessage {
    readonly pattern: Pattern
    constructor(init: {
        id?: string | number;
        pattern?: Pattern;
        headers?: Record<string, any>;
        data?: string | Buffer | IReadableStream | null;
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
        data?: any;
        streamLength?: number;
    }): Message;
}
