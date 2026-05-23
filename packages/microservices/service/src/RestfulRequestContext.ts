import { Abstract } from '@tsdi/ioc';
import { Incoming, Outgoing } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';

/**
 * Abstract Restful request context.
 * Mirrors packages/services/endpoints/src/RestfulRequestContext.ts.
 */
@Abstract()
export abstract class RestfulRequestContext<
    TRequest extends Incoming<any> = Incoming<any>,
    TResponse extends Outgoing<any> = Outgoing<any>,
    TStatus = any
> extends AbstractRequestContext<TRequest, TResponse, TStatus> {
    abstract get URL(): URL;
    get params(): URLSearchParams {
        return this.URL.searchParams;
    }
    abstract get cookies(): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void };
    abstract get secure(): boolean;
    abstract get session(): Record<string, any> | undefined;
    abstract get body(): any;
    abstract set body(value: any);
    abstract get hostname(): string;
    abstract get method(): string;
    abstract get path(): string;
    abstract get originalUrl(): string;
    abstract redirect(url: string, status?: number): void;
    abstract render(template: string, data?: Record<string, any>): Promise<void>;
    abstract json(data: any): void;
    abstract send(data: any): void;
    abstract html(data: string): void;
    abstract text(data: string): void;
    abstract sendStatus(code: number): void;

    // Narrower: security code calls .replace() on getHeader result
    abstract getHeader(name: string): string | undefined;
}
