import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ExecptionFilter, MiddlewareLike, HeaderContext, AssetContext, TransportContext, TransportServer } from '@tsdi/core';
import { Injector, InvokeArguments, Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../../asset.ctx';
import { hdr } from '../../consts';
import { emptyStatus } from '../../http';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';



const abstUrlExp = /^(tcp|icp):/;

/**
 * TCP context.
 */
export class TcpContext extends AssetServerContext<TcpServRequest, TcpServResponse> implements HeaderContext, AssetContext {

    constructor(injector: Injector, readonly protocol: 'tcp' | 'ipc', request: TcpServRequest, response: TcpServResponse, target: TransportServer, options?: InvokeArguments) {
        super(injector, request, response, target, options)
    }

    private _url?: string;
    get url(): string {
        if (!this._url) {
            this._url = this.pathname + this.URL.search;
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
                this._URL = abstUrlExp.test(originalUrl) ? new URL(originalUrl) : new URL(`${this.protocol}://${originalUrl}`);
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
        return this.request.method === 'PUT' || this.request.getHeader(hdr.OPERATION) === 'update';
    }


    get status(): number {
        return this.response.status
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        this.response.status = status;
        if (this.body && this.isEmptyStatus(status)) {
            this.body = null;
        }
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? statusMessage[this.status as HttpStatusCode]
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get ok(): boolean {
        return this.response.ok;
    }

    get sent(): boolean {
        return this.response.sent;
    }

    protected isSelf(token: Token) {
        return token === TcpContext || token === AssetServerContext || token === TransportContext;
    }

    protected override isEmptyStatus(status: number): boolean {
        return emptyStatus[status];
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
