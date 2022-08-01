import { ExecptionFilter, MiddlewareLike, HeadersContext, AssetContext, TransportContext } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../asset.ctx';
import { hdr } from '../consts';
import { ServerRequest } from './req';
import { ServerResponse } from './res';


/**
 * Transport protocol context.
 */
export class PrototcolContext extends AssetServerContext<ServerRequest, ServerResponse> implements HeadersContext, AssetContext {


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

    get writable(): boolean {
        if (this.response.writableEnded || this.response.finished) return false;
        if (!this.response.socket) return true;
        return this.response.writable;
    }

    isUpdate(): boolean {
        return this.request.method === 'PUT' || this.getHeader(hdr.OPERATION) === 'update';
    }

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
