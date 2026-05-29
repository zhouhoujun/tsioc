import { Injectable, isNil } from '@tsdi/ioc';
import { AbstractMessageReader, MessageReaderFactory, MessageSection } from '@tsdi/core';
import { Header, HeaderAccess, HeaderCapableMessageAdapter, Incoming, MessageAdapter, Outgoing, RequestCapableMessageAdapter, ResponseCapableMessageAdapter } from '@tsdi/common';
import * as coap from 'coap';

@Injectable()
export class CoapMessageReaderFactory extends MessageReaderFactory {
    create(message?: any): AbstractMessageReader {
        return new CoapMessageReader(message);
    }
}

@Injectable()
export class CoapMessageReader<TBody = any> extends AbstractMessageReader<TBody> {
    private incoming?: Incoming<TBody> & Record<string, any>;

    override field(section: any, name?: string): any {
        if (section) {
            return super.field(section, name);
        }
        const direct = [
            name ? this.query(name) : undefined,
            name ? this.path(name) : undefined,
            name ? this.param(name) : undefined,
            name ? this.body(name) : undefined,
            name ? this.payload(name) : undefined,
            name ? this.header(name) : undefined
        ].find(value => value !== undefined && value !== null);
        return direct;
    }

    constructor(incoming?: Incoming<TBody> & Record<string, any>) {
        super();
        this.incoming = incoming;
    }

    receive(input: Incoming<TBody> & Record<string, any>): void {
        this.incoming = input;
    }

    headers(): Record<string, any> {
        return this.incoming?.headers ?? {};
    }

    header(name: string): any {
        const incoming = this.incoming;
        if (!incoming) {
            return undefined;
        }
        if (typeof incoming.getHeader === 'function') {
            return incoming.getHeader(name);
        }
        const headers = incoming.headers as HeaderAccess | Record<string, any> | undefined;
        return (headers as HeaderAccess | undefined)?.getHeader?.(name)
            ?? (headers as Record<string, any> | undefined)?.[name.toLowerCase()]
            ?? (headers as Record<string, any> | undefined)?.[name];
    }

    payload(): TBody | null | undefined;
    payload<K extends keyof TBody>(field: K): TBody[K];
    payload(field: string): any;
    payload(field?: string): any {
        const payload = this.incoming?.payload ?? this.incoming?.body;
        if (field === undefined) {
            return payload;
        }
        return payload ? (payload as any)[field] : undefined;
    }

    body(): TBody | null | undefined;
    body<K extends keyof TBody>(field: K): TBody[K];
    body(field: string): any;
    body(field?: string): any {
        const body = this.incoming?.body ?? this.incoming?.payload;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    params(): Record<string, any> | undefined {
        return this.incoming?.params;
    }

    param(name: string): any {
        return this.incoming?.params?.[name];
    }

    query(): Record<string, any> | undefined;
    query(name: string): any;
    query(name?: string): any {
        const query = this.incoming?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    path(): Record<string, any> | undefined;
    path(name: string): any;
    path(name?: string): any {
        const path = this.incoming?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    topic(): string | undefined {
        return this.incoming?.pattern;
    }
}

@Injectable()
export class CoapMessageAdapter extends MessageAdapter<Record<string, any>, coap.OutgoingMessage> implements RequestCapableMessageAdapter<Record<string, any>>, ResponseCapableMessageAdapter<Outgoing<any>>, HeaderCapableMessageAdapter {
    private incoming?: Record<string, any>;
    private outgoing?: Outgoing<any>;

    bind(request: Record<string, any>, _response?: coap.OutgoingMessage): void {
        this.incoming = request;
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

    getRequest(): Record<string, any> | undefined {
        return this.incoming;
    }

    getResponse(): Outgoing<any> | undefined {
        return this.outgoing;
    }

    getHeaders(): Record<string, any> {
        return this.headers();
    }

    getHeader(name: string): any {
        return this.header(name);
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
        return this.incoming?.headers ?? {};
    }

    protected header(name: string): any {
        const incoming = this.incoming;
        if (!incoming) {
            return undefined;
        }
        if (typeof incoming.getHeader === 'function') {
            return incoming.getHeader(name);
        }
        const headers = incoming.headers as HeaderAccess | Record<string, any> | undefined;
        return (headers as HeaderAccess | undefined)?.getHeader?.(name)
            ?? (headers as Record<string, any> | undefined)?.[name.toLowerCase()]
            ?? (headers as Record<string, any> | undefined)?.[name];
    }

    protected payload(field?: string): any {
        const payload = this.incoming?.payload ?? this.incoming?.body;
        if (field === undefined) {
            return payload;
        }
        return payload ? (payload as any)[field] : undefined;
    }

    protected body(field?: string): any {
        const body = this.incoming?.body ?? this.incoming?.payload;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected params(): Record<string, any> | undefined {
        return this.incoming?.params;
    }

    protected param(name: string): any {
        return this.incoming?.params?.[name];
    }

    protected query(name?: string): any {
        const query = this.incoming?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    protected path(name?: string): any {
        const path = this.incoming?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    protected topic(): string | undefined {
        return this.incoming?.pattern;
    }
}
