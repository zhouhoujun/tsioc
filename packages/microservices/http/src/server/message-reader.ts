import { Injectable } from '@tsdi/ioc';
import { AbstractMessageReader, MessageReaderFactory } from '@tsdi/core';
import { HeaderAccess } from '@tsdi/common';
import { HttpRequestMessage } from './http-context';

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
