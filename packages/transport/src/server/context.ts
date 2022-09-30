import { ExecptionFilter, MiddlewareLike, HeadersContext, AssetContext, ServerEndpointContext, ServerContext } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';
import { ServerRequest } from './req';
import { ServerResponse } from './res';


/**
 * Transport context for `TransportServer`.
 */
export class TransportContext extends AssetServerContext<ServerRequest, ServerResponse> implements HeadersContext, AssetContext {


    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.transport.status.isEmpty(status)) {
            this.body = null;
        }
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? this.transport.status.message(this.status)
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get sent(): boolean {
        return this.response.headersSent;
    }

    get writable(): boolean {
        if (this.response.writableEnded || this.response.finished) return false;
        if (!this.response.socket) return true;
        return this.response.writable;
    }

    protected isSelf(token: Token) {
        return token === TransportContext || token === AssetServerContext || token === ServerEndpointContext || token === ServerContext;
    }

}

/**
 * Transport server Middlewares.
 */
export const SERVER_MIDDLEWARES = tokenId<MiddlewareLike<TransportContext>[]>('SERVER_MIDDLEWARES');
/**
 * Transport server execption filters.
 */
export const SERVER_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('SERVER_EXECPTION_FILTERS');
