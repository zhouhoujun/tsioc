import { Injectable, isNil, lang, isString } from '@tsdi/ioc';
import { AbstractMessageReader, MessageReaderFactory, MessageSection } from '@tsdi/core';
import { AcceptsPriority, Header, HeaderAccess, HeaderCapableMessageAdapter, MessageAdapter, MimeAdapter, Outgoing, AcceptsCapableMessageAdapter, ResponseStateCapableMessageAdapter } from '@tsdi/common';
import { HttpRequestMessage, HttpServResponse } from './http-context';

@Injectable()
export class HttpMessageReaderFactory extends MessageReaderFactory {
    create(message?: any): AbstractMessageReader {
        return new HttpMessageReader(message);
    }
}

@Injectable()
export class HttpMessageReader<TBody = any> extends AbstractMessageReader<TBody> {
    private request?: HttpRequestMessage<TBody>;

    constructor(request?: HttpRequestMessage<TBody>) {
        super();
        this.request = request;
    }

    override receive(input: HttpRequestMessage<TBody>): void {
        this.request = input;
    }

    headers(): Record<string, any> {
        return this.request?.headers ?? {};
    }

    header(name: string): any {
        const request = this.request;
        if (!request) {
            return undefined;
        }
        return request.getHeader(name) ?? (request.headers as HeaderAccess | undefined)?.getHeader?.(name);
    }

    payload(): TBody | null | undefined;
    payload<K extends keyof TBody>(field: K): TBody[K];
    payload(field: string): any;
    payload(field?: string): any {
        const body = this.request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    body(): TBody | null | undefined;
    body<K extends keyof TBody>(field: K): TBody[K];
    body(field: string): any;
    body(field?: string): any {
        const body = this.request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    params(): Record<string, any> | undefined {
        return this.request?.params;
    }

    param(name: string): any {
        return this.request?.params?.[name];
    }

    query(): Record<string, any> | undefined;
    query(name: string): any;
    query(name?: string): any {
        const query = this.request?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    path(): Record<string, any> | undefined;
    path(name: string): any;
    path(name?: string): any {
        const path = this.request?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    topic(): string | undefined {
        return undefined;
    }
}

@Injectable()
export class HttpMessageAdapter<TBody = any> extends MessageAdapter<HttpRequestMessage<TBody>, HttpServResponse> implements HeaderCapableMessageAdapter, ResponseStateCapableMessageAdapter, AcceptsCapableMessageAdapter {
    private request?: HttpRequestMessage<TBody>;
    private outgoing?: Outgoing<any>;

    constructor(
        private acceptsPriority?: AcceptsPriority,
        private mimeAdapter?: MimeAdapter
    ) {
        super();
    }

    bind(request: HttpRequestMessage<TBody>, _response?: HttpServResponse): void {
        this.request = request;
    }

    setOutgoing(outgoing: Outgoing<any>) {
        this.outgoing = outgoing;
    }

    read(section: MessageSection, name?: string): any {
        switch (section) {
            case 'headers':
                return name ? this.header(name) : this.headers();
            case 'payload':
                return name ? this.payload(name) : this.payload();
            case 'body':
                return name ? this.body(name) : this.body();
            case 'params':
                return name ? this.param(name) : this.params();
            case 'query':
                return name ? this.query(name) : this.query();
            case 'path':
                return name ? this.path(name) : this.path();
            case 'topic':
                return this.topic();
            default:
                return undefined;
        }
    }

    getHeaders(): Record<string, any> {
        return this.headers();
    }

    getHeader(name: string): any {
        return this.header(name);
    }

    accepts(...args: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept') ?? '*';
        if (!args.length) {
            return accepts ?? false;
        }
        const mimeAdapter = this.mimeAdapter;
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter?.lookup(a) ?? a : a).filter(a => isString(a)) as string[];
        return lang.first(acceptsPriority.priority(accepts, medias, 'media')) ?? false;
    }

    acceptsEncodings(...encodings: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-encoding') ?? '*';
        if (!encodings.length) {
            return accepts;
        }
        return lang.first(acceptsPriority.priority(accepts, encodings, 'encodings')) ?? false;
    }

    acceptsCharsets(...charsets: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-charset') ?? '*';
        if (!charsets.length) {
            return accepts;
        }
        return lang.first(acceptsPriority.priority(accepts, charsets, 'charsets')) ?? false;
    }

    acceptsLanguages(...langs: string[]): string | string[] | false {
        const acceptsPriority = this.acceptsPriority;
        if (!acceptsPriority) return '*';
        const accepts = this.getHeader('accept-language') ?? '*';
        if (!langs.length) {
            return accepts;
        }
        return lang.first(acceptsPriority.priority(accepts, langs, 'lang')) ?? false;
    }

    write(body: any): void {
        if (this.outgoing) {
            this.outgoing.body = body;
        }
    }

    setHeader(name: string, value: Header): void {
        this.outgoing?.setHeader(name, value);
    }

    removeHeader(name: string): void {
        this.outgoing?.removeHeader(name);
    }

    setStatus(code: any, message?: string): void {
        if (this.outgoing) {
            this.outgoing.statusCode = code;
            if (!isNil(message)) {
                this.outgoing.statusMessage = message;
            }
        }
    }

    writeError(error: any): void {
        if (this.outgoing) {
            this.outgoing.error = error;
        }
    }

    protected headers(): Record<string, any> {
        return this.request?.headers ?? {};
    }

    protected header(name: string): any {
        const request = this.request;
        if (!request) {
            return undefined;
        }
        return request.getHeader(name) ?? (request.headers as HeaderAccess | undefined)?.getHeader?.(name);
    }

    protected payload(field?: string): any {
        const body = this.request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected body(field?: string): any {
        const body = this.request?.body;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected params(): Record<string, any> | undefined {
        return this.request?.params;
    }

    protected param(name: string): any {
        return this.request?.params?.[name];
    }

    protected query(name?: string): any {
        const query = this.request?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    protected path(name?: string): any {
        const path = this.request?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    protected topic(): string | undefined {
        return undefined;
    }
}
