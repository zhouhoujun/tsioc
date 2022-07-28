import { ExecptionFilter, MiddlewareLike, HeadersContext, AssetContext, TransportContext } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../../asset.ctx';
import { hdr } from '../../consts';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';




/**
 * TCP context.
 */
export class TcpContext extends AssetServerContext<TcpServRequest, TcpServResponse> implements HeadersContext, AssetContext {

    isUpdate(): boolean {
        return this.request.method === 'PUT' || this.getHeader(hdr.OPERATION) === 'update';
    }

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
        return token === TcpContext || token === AssetServerContext || token === TransportContext;
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
