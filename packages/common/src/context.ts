import { Context, ContextToken, Injector, Token, RunContext } from '@tsdi/ioc';
import { ContentType, HeadersLike } from './headers';
import { Outgoing } from './outgoing';
import { OutgoingFactory } from './outgoing.impl';
import { Incoming } from './incoming';


const CONTENT_LENGTH = new ContextToken<number | null>(() => null);
const CONTENT_TYPE = new ContextToken<string | null>(() => ContentType.APPL_JSON);
const CONTENT_ENCODING = new ContextToken<string | null>(() => null);

// const STATUS = new ContextToken<string | number | null>(() => null);
// const STATUS_MESSAGE = new ContextToken<string | null>(() => null);

// const HEADER = new ContextToken<Record<string, string | string[] | undefined>>(() => ({}));

// const PROTOCOL = new ContextToken<string | undefined>(() => undefined);

const RESPONSE = new ContextToken<Outgoing<any, any> | null>(() => null);


export class RequestContext extends RunContext {

    setResponse(options: {
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
    }) {
        if (this.has(RESPONSE)) {
            const responsed = this.get(RESPONSE) ?? this.createResponse(options);
            if (options.headers) {
                // responsed.setHeader(options.headers);
            }
            if ('payload' in options) {
                responsed.body = options.payload;
            }
            if ('status' in options) {
                responsed.statusCode = options.status;
            } else if ('statusCode' in options) {
                responsed.statusCode = options.statusCode;
            }

            if (options.statusMessage) {
                responsed.statusMessage = options.statusMessage;
            } else if (options.statusText) {
                responsed.statusMessage = options.statusText;
            }
        } else {
            this.set(RESPONSE, this.createResponse(options));
        }
    }

    protected createResponse(response: {
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
    }): Outgoing<any, any> {
        return this.get(OutgoingFactory).create(response);
    }

    getResponse(): Outgoing<any, any> | null {
        return this.get(RESPONSE);
    }


    /**
     * get request encoding.
     * @returns 
     */
    getContentEncoding(): string | null {
        return this.get(CONTENT_ENCODING)
    }

    /**
     * set content encoding.
     * @param encoding 
     */
    setContentEncoding(encoding: string | null) {
        this.set(CONTENT_ENCODING, encoding);
    }
    /**
     * get content type
     * @param type 
     */
    getContentType(): string | null | undefined {
        return this.get(CONTENT_TYPE);
    }
    /**
     * set content type
     * @param type 
     */
    setContentType(type: string | null | undefined) {
        this.set(CONTENT_TYPE, type);
    }


    getContentLength(): number | null {
        return this.get(CONTENT_LENGTH);
    }

    setContentLength(len: number | null) {
        this.set(CONTENT_LENGTH, len);
    }

}

export function createRequestContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RequestContext;
export function createRequestContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RequestContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

