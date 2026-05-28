import { Injectable } from '@tsdi/ioc';
import { AbstractMessageReader, MessageReaderFactory } from '@tsdi/core';
import { HeaderAccess, Incoming } from '@tsdi/common';

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
