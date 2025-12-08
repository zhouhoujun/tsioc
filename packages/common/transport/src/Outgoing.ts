import { Injectable } from '@tsdi/ioc';
import { Header, HeadersLike, StatusOptions, HeaderMappings, Incoming, IReadable, IWritable, StreamAdapter, OutgoingMessage, Outgoing, TOutgoing } from '@tsdi/common';





export abstract class AbstractOutgoingFactory<T extends OutgoingMessage = OutgoingMessage> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): TOutgoing<T>
}

/**
 * Outgoing factory.
 */
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
    }): TOutgoing<Outgoing>
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
    readonly error: any | null;
    readonly ok: boolean;
    readonly headers: HeaderMappings;

    protected _status: TStatus | null;
    protected _message: string | undefined;

    constructor(init: OutgoingOpts, defaultStatus?: TStatus, defaultStatusText?: string) {
        this.pattern = init.pattern;
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers);
        this.ok = init.error ? false : init.ok != false;
        this.error = init.error;
        this.type = init.type;
        this._status = init.status !== undefined ? init.status : defaultStatus ?? null;
        this._message = (init.statusMessage || init.statusText) ?? defaultStatusText;
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
    create(options: OutgoingOpts & { url: string }): TOutgoing<UrlOutgoing> {
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
    create(options: OutgoingOpts & { topic: string }): TOutgoing<TopicOutgoing> {
        if (this.streamAdapter.isReadable(options.payload)) {
            return parseTopicOutgoing(options);
        }
        return new TopicOutgoing(options);
    }
}
