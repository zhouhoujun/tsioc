import { ExecptionFilter, MiddlewareLike, HeadersContext, AssetContext, ConnectionContext } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext, hdr } from '@tsdi/transport';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';




/**
 * TCP context.
 */
export class TcpContext extends AssetServerContext<TcpServRequest, TcpServResponse> implements HeadersContext, AssetContext {

    get writable(): boolean {
        return this.response.socket.writable
    }

    get status(): number {
        return this.response.statusCode
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        this.response.statusCode = status;
        if (this.body && this.protocol.status.isEmpty(status)) {
            this.body = null;
        }
    }

    get statusMessage(): string {
        return this.response.statusMessage ?? this.protocol.status.message(this.status)
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get sent(): boolean {
        return this.response.headersSent;
    }

    protected isSelf(token: Token) {
        return token === TcpContext || token === AssetServerContext || token === ConnectionContext;
    }

    protected override onBodyChanged(newVal: any, oldVal: any): void {
        this.response.body = newVal;
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
