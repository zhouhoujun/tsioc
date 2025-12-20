import { Abstract, Exception, Injectable, isNil, Provider } from '@tsdi/ioc';
import { Outgoing, OutgoingMessage } from './outgoing';
import { Header, HeaderMappings, HeadersLike } from './headers';
import { Incoming } from './incoming';
import { StatusOptions } from './response';
import { IReadable, IWritable, WritableLike } from './stream';
import { StreamAdapter } from './StreamAdapter';




/**
 * Abstract outgoing factory.
 */
@Abstract()
export abstract class AbstractOutgoingFactory<T extends OutgoingMessage = OutgoingMessage> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): WritableLike<T>
}

/**
 * Outgoing factory.
 */
@Abstract()
export abstract class OutgoingFactory implements AbstractOutgoingFactory<Outgoing<any>> {
    abstract create(options: {
        incoming?: Incoming;
        id?: any;
        socket?: any;
        pattern?: string;
        /**
         * event type
         */
        type?: number;
        status?: any;
        statusMessage?: string;
        statusCode?: any;
        statusText?: string;
        ok?: boolean;
        error?: any;
        headers?: HeadersLike;
        payload?: any;
    }): WritableLike<Outgoing>
}


/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    id?: any;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}


/**
 * abstract server outgoing.
 */
@Abstract()
export abstract class AbstractOutgoing<T, TStatus = any> implements Outgoing<T, TStatus> {
    /**
     * packet id
     */
    id?: string | number;

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    readonly pattern?: string;
    private _error: any | null;
    private _ok: boolean;
    readonly headers: HeaderMappings;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    body?: T | null;

    constructor(init: OutgoingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        this.pattern = init.pattern;
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers);
        this._ok = init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
    }

    get ok(): boolean {
        return this._ok;
    }

    get error(): any | null {
        return this._error;
    }

    set error(err: any | null) {
        if(err) {
            this._ok = false;
            if(err instanceof Exception) {
                this.statusCode = err.code;
                this.statusMessage = err.message;
            }
        }
        this._error = err;
    }



    get statusCode(): TStatus {
        return this._status!;
    }
    set statusCode(code: TStatus) {
        this._status = code;
    }


    get status(): TStatus {
        return this._status!;
    }
    set status(code: TStatus) {
        this._status = code;
    }


    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    set statusText(text: string) {
        this._message = text;
    }

    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message!
    }


    set statusMessage(message: string) {
        this._message = message;
    }

    get statusMessage(): string {
        return this._message!
    }

    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }

    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field)
    }

    setHeader(field: string, val: Header): void {
        this.headers.setHeader(field, val);
    }
    removeHeader(field: string): void {
        this.headers.removeHeader(field);
    }

    abstract toJson(payloadKey?: 'body' | 'payload'): Record<string, any>;

}

/**
 * Url outgoing
 */
export class UrlOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly url: string;
    constructor(init: OutgoingOpts & { url: string }) {
        super(init)
        this.url = init.url;
    }

    /**
     * parse url outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns 
     */
    toJson(payloadKey: 'body' | 'payload' = 'body'): Record<string, any> {
        const json: Record<string, any> = {
            url: this.url,
            ok: this.ok,
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!isNil(this.status)) {
            json.status = this.status;
        }
        if (this.statusMessage) {
            json.statusMessage = this.statusMessage;
        }
        if (!isNil(this.body)) {
            json[payloadKey] = this.body;
        }

        return json;
    }

}



export function parseUrlOutgoing(init: OutgoingOpts<IReadable> & { url: string }): UrlOutgoing<any> & IWritable {
    const outgoing = (init.body ?? init.payload) as any;
    outgoing.id = init.id;
    outgoing.url = init.url;
    outgoing.headers = new HeaderMappings(init.headers);
    outgoing.pattern = init.pattern;
    outgoing.status = init.status ?? init.statusCode;
    outgoing.statusMessage = init.statusMessage ?? init.statusText;
    return outgoing as (IWritable & UrlOutgoing<any>);
}

@Injectable()
export class UrlOutgoingFactory implements OutgoingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: OutgoingOpts & { url: string }): WritableLike<UrlOutgoing> {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseUrlOutgoing(options);
        }
        return new UrlOutgoing(options);
    }
}



/**
 * Topic outgoing
 */
export class TopicOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly topic: string;
    constructor(init: OutgoingOpts & { topic: string }) {
        super(init)
        this.topic = init.topic;
    }

    /**
     * parse topic outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns 
     */
    toJson(payloadKey: 'body' | 'payload' = 'body'): Record<string, any> {
        const json: Record<string, any> = {
            topic: this.topic,
            ok: this.ok,
        };
        if (this.id) {
            json.id = this.id;
        }
        if (this.pattern) {
            json.pattern = this.pattern;
        }
        if (this.headers.size) {
            json.headers = this.headers.getHeaders();
        }
        if (!isNil(this.status)) {
            json.status = this.status;
        }
        if (this.statusMessage) {
            json.statusMessage = this.statusMessage;
        }
        if (!isNil(this.body)) {
            json[payloadKey] = this.body;
        }

        return json;
    }
}


export function parseTopicOutgoing(init: OutgoingOpts<IReadable> & { topic: string }): TopicOutgoing<any> & IWritable {
    const outgoing = (init.body ?? init.payload) as any;
    outgoing.id = init.id;
    outgoing.topic = init.topic;
    outgoing.headers = new HeaderMappings(init.headers);
    outgoing.pattern = init.pattern;
    outgoing.status = init.status ?? init.statusCode;
    outgoing.statusMessage = init.statusMessage ?? init.statusText;
    return outgoing as (IWritable & TopicOutgoing<any>);
}

@Injectable()
export class TopicOutgoingFactory implements OutgoingFactory {

    constructor(private streamAdapter: StreamAdapter) { }
    create(options: OutgoingOpts & { topic: string }): WritableLike<TopicOutgoing> {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseTopicOutgoing(options);
        }
        return new TopicOutgoing(options);
    }
}



export function provideOutgoings(): Provider[] {
    return [
        UrlOutgoingFactory,
        TopicOutgoingFactory
    ]
}