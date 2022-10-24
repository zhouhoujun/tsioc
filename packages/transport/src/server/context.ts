import { MiddlewareLike, ServerEndpointContext, ServerContext, Incoming, Outgoing, ListenOpts } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';

/**
 * Transport context for `TransportServer`.
 */
export class TransportContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends AssetServerContext<TRequest, TResponse> {
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get update(): boolean {
        throw new Error('Method not implemented.');
    }
    get secure(): boolean {
        throw new Error('Method not implemented.');
    }
    match(protocol: string): boolean {
        throw new Error('Method not implemented.');
    }
    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    parseURL(incoming: Incoming<any>, opts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
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
