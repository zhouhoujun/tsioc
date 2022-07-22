import { ExecptionFilter, MiddlewareLike, HeaderContext, AssetContext, TransportContext } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';
import { hdr } from '../consts';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { TransportProtocol } from '../protocol';


/**
 * Transport protocol context.
 */
export class PrototcolContext extends AssetServerContext<ServerRequest, ServerResponse> implements HeaderContext, AssetContext {


    private _protocol?: TransportProtocol;

    get transProtocol() {
        if (!this._protocol) {
            this._protocol = this.get(TransportProtocol);
        }
        return this._protocol;
    }

    get protocol() {
        return this.transProtocol.protocol;
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
                this._URL = this.transProtocol.parseURL(originalUrl);
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
            const qs = this._query = { ...this.request.params } as Record<string, any>;
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
        return this.request.method === 'PUT' || this.getHeader(hdr.OPERATION) === 'update';
    }

    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.adapter.isEmpty(status)) {
            this.body = null;
        }
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? this.adapter.message(this.status)
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get sent(): boolean {
        return this.response.headersSent;
    }

    // write(chunk: string | Uint8Array, cb?: ((err?: Error | null | undefined) => void) | undefined): boolean;
    // write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: ((err?: Error | null | undefined) => void) | undefined): boolean;
    // write(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null | undefined) => void) | undefined, cb?: ((err?: Error | null | undefined) => void) | undefined): boolean;
    // write(chunk: string | Uint8Array, encoding?: any, cb?: any): boolean {
    //     const protocol = this.get(PacketProtocol);
    //     if (isFunction(encoding)) {
    //         cb = encoding;
    //         encoding = undefined;
    //     }
    //     protocol.write(this.response.socket, { id: this.response.id, body: chunk }, encoding)
    //         .then(() => cb && cb())
    //         .catch(err => cb && cb(err));
    //     return true;
    // }

    protected isSelf(token: Token) {
        return token === PrototcolContext || token === AssetServerContext || token === TransportContext;
    }

    protected override onBodyChanged(newVal: any, oldVal: any): void {
        // this.response.body = newVal;
    }


}

/**
 * Prototcol Middlewares.
 */
export const PROTOTCOL_MIDDLEWARES = tokenId<MiddlewareLike<PrototcolContext>[]>('TCP_MIDDLEWARES');
/**
 * Prototcol execption filters.
 */
export const PROTOTCOL_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');
