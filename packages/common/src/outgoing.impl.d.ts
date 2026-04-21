import { StaticProvider } from '@tsdi/ioc';
import { Outgoing, OutgoingMessage } from './outgoing';
import { Header, HeaderMappings, HeadersLike } from './headers';
import { Incoming } from './incoming';
import { StatusOptions } from './response';
import { IReadable, IWritable, WritableLike } from './stream';
import { StreamAdapter } from './StreamAdapter';
/**
 * Abstract outgoing factory.
 */
export declare abstract class AbstractOutgoingFactory<T extends OutgoingMessage = OutgoingMessage> {
    abstract create(options: {
        socket?: any;
        pattern?: string;
        headers?: HeadersLike;
        payload?: any;
    }): WritableLike<T>;
}
/**
 * Outgoing factory.
 */
export declare abstract class OutgoingFactory implements AbstractOutgoingFactory<Outgoing<any>> {
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
    }): WritableLike<Outgoing>;
}
/**
 * Outgoing packet options.
 */
export interface OutgoingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    id?: any;
    incoming?: Incoming;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}
/**
 * abstract server outgoing.
 */
export declare abstract class AbstractOutgoing<T, TStatus = any> implements Outgoing<T, TStatus> {
    /**
     * packet id
     */
    id?: string | number;
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number | undefined;
    readonly pattern?: string;
    private _error;
    private _ok;
    readonly headers: HeaderMappings;
    protected _status: TStatus | null;
    protected _message: string | undefined;
    body?: T | null;
    constructor(init: OutgoingOpts, defaultStatus?: TStatus, defaultStatusText?: string);
    get ok(): boolean;
    get error(): any | null;
    set error(err: any | null);
    get statusCode(): TStatus;
    set statusCode(code: TStatus);
    get status(): TStatus;
    set status(code: TStatus);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    set statusText(text: string);
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string;
    set statusMessage(message: string);
    get statusMessage(): string;
    hasHeader(field: string): boolean;
    getHeader(field: string): string | undefined;
    setHeader(field: string, val: Header): void;
    removeHeader(field: string): void;
    abstract toJson(payloadKey?: 'body' | 'payload'): Record<string, any>;
}
/**
 * Pattern outgoing
 */
export declare class PatternOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly pattern: string;
    constructor(init: OutgoingOpts & {
        pattern: string;
    });
    /**
     * parse url outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey?: 'body' | 'payload'): Record<string, any>;
}
export declare function parsePatternOutgoing(init: OutgoingOpts<IReadable> & {
    pattern: string;
}): PatternOutgoing<any> & IWritable;
export declare class PatternOutgoingFactory implements OutgoingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create(options: OutgoingOpts & {
        pattern: string;
    }): WritableLike<PatternOutgoing>;
}
/**
 * Url outgoing
 */
export declare class UrlOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly url: string;
    constructor(init: OutgoingOpts & {
        url: string;
    });
    /**
     * parse url outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey?: 'body' | 'payload'): Record<string, any>;
}
export declare function parseUrlOutgoing(init: OutgoingOpts<IReadable> & {
    url: string;
}): UrlOutgoing<any> & IWritable;
export declare class UrlOutgoingFactory implements OutgoingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create(options: OutgoingOpts & {
        url: string;
    }): WritableLike<UrlOutgoing>;
}
/**
 * Topic outgoing
 */
export declare class TopicOutgoing<T = any, TStatus = any> extends AbstractOutgoing<T, TStatus> {
    readonly topic: string;
    constructor(init: OutgoingOpts & {
        topic: string;
    });
    /**
     * parse topic outgoing to simple json.
     * @param payloadKey payload key. default is 'body'.
     * @returns
     */
    toJson(payloadKey?: 'body' | 'payload'): Record<string, any>;
}
export declare function parseTopicOutgoing(init: OutgoingOpts<IReadable> & {
    topic: string;
}): TopicOutgoing<any> & IWritable;
export declare class TopicOutgoingFactory implements OutgoingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create(options: OutgoingOpts & {
        topic: string;
    }): WritableLike<TopicOutgoing>;
}
export declare function provideOutgoings(): StaticProvider[];
