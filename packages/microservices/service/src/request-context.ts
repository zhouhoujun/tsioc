import { RequestContext } from '@tsdi/common';

export abstract class AbstractRequestContext extends RequestContext {
    abstract get request(): any;
    abstract get response(): any;
    abstract get query(): Record<string, any>;
    abstract getHeader(name: string): string | undefined;
}

export abstract class RestfulRequestContext extends AbstractRequestContext {
    abstract get cookies(): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void };
    abstract get secure(): boolean;
    abstract get session(): Record<string, any> | undefined;
    abstract get body(): any;
    abstract set body(value: any);
    abstract get path(): string;
    abstract redirect(url: string, status?: number): void;
}
