import { MiddlewareLike, ServerEndpointContext, ServerContext, Incoming, Outgoing } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';

/**
 * Transport context for `TransportServer`.
 */
export class TransportContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends AssetServerContext<TRequest, TResponse> {

    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.status.status.isEmpty(status)) {
            this.body = null;
        }
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? this.status.status.message(this.status)
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get sent(): boolean {
        return this.response.headersSent;
    }

    get writable(): boolean {
        if (this.response.writableEnded || this.response.finished) return false;
        return this.response.writable === true;
    }

    protected isSelf(token: Token) {
        return token === TransportContext || token === AssetServerContext || token === ServerEndpointContext || token === ServerContext;
    }

}

/**
 * Transport middlewares token of server.
 */
export const SERVER_MIDDLEWARES = tokenId<MiddlewareLike<TransportContext>[]>('SERVER_MIDDLEWARES');
