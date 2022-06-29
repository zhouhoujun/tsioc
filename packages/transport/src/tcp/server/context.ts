import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ServerContext, ExecptionFilter, MiddlewareLike, Protocol } from '@tsdi/core';
import { Injectable, tokenId } from '@tsdi/ioc';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';



/**
 * TCP context.
 */
@Injectable()
export class TcpContext extends ServerContext<TcpServRequest, TcpServResponse> {

    readonly protocol: Protocol = 'tcp';  

    private _url?: string;
    get url(): string {
        if (!this._url) {
            this._url = this.request.url;
        }
        return this._url;
    }
    set url(value: string) {
        this._url = value;
    }

    get originalUrl(): string {
        return this.request.url;
    }

    private _URL?: URL;
    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    get URL(): URL {
        /* istanbul ignore else */
        if (!this._URL) {
            const originalUrl = this.originalUrl || ''; // avoid undefined in template string
            try {
                this._URL = new URL(`tcp://${originalUrl}`);
            } catch (err) {
                this._URL = Object.create(null);
            }
        }
        return this._URL!;
    }

    get pathname(): string {
        return this.URL.pathname;
    }

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = {} as Record<string, any>;
            this.URL.searchParams.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }

    get method(): string {
        return this.request.method;
    }

    isUpdate(): boolean {
        return this.request.isUpdate;
    }

    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(value: any) {
        throw new Error('Method not implemented.');
    }

    get length(): number | undefined {
        throw new Error('Method not implemented.');
    }

    get status(): number {
        return this.response.status
    }
    set status(status: number) {
        this.response.status = status;
    }
    get statusMessage(): string {
        return this.response.statusMessage ?? statusMessage[this.status as HttpStatusCode]
    }

    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }

    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }

    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }
    

}

/**
 * TCP Middlewares.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike<TcpContext>[]>('TCP_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');
