import { MiddlewareLike, ServerEndpointContext, ServerContext, Incoming, Outgoing, ListenOpts, ServerContextOpts } from '@tsdi/core';
import { Abstract, Injector, Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';
import { TransportServer } from './server';

@Abstract()
export abstract class IncomingUtil {

    /**
     * get protocol of incoming message.
     * @param incoming 
     */
    abstract getProtocol(incoming: Incoming): string;
    /**
     * is request update or not.
     * @param req 
     */
    abstract isUpdate(req: Incoming): boolean;
    /**
     * is secure or not.
     * @param incoming 
     */
    abstract isSecure(incoming: Incoming): boolean;
    /**
     * parse url.
     * @param req 
     * @param opts 
     * @param proxy 
     */
    abstract parseURL(req: Incoming, opts: ListenOpts, proxy?: boolean): URL;
    /**
     * is absolute url.
     * @param url 
     */
    abstract isAbsoluteUrl(url: string): boolean;

}

/**
 * Transport context for `TransportServer`.
 */
export class TransportContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends AssetServerContext<TRequest, TResponse> {

    constructor(injector: Injector, request: TRequest, response: TResponse, readonly target: TransportServer<TRequest, TResponse>, readonly util: IncomingUtil, options?: ServerContextOpts) {
        super(injector, request, response, target, options)
    }

    get protocol(): string {
        return this.util.getProtocol(this.request)
    }
    get update(): boolean {
        return this.util.isUpdate(this.request)
    }
    get secure(): boolean {
        return this.util.isSecure(this.request)
    }
    match(protocol: string): boolean {
        return protocol === this.protocol;
    }
    isAbsoluteUrl(url: string): boolean {
        return this.util.isAbsoluteUrl(url)
    }

    parseURL(incoming: Incoming<any>, opts: ListenOpts, proxy?: boolean | undefined): URL {
        return this.util.parseURL(incoming, opts, proxy);
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
