import { ExecptionFilter, MiddlewareLike, ProtocolType, HeaderContext, AssetContext } from '@tsdi/core';
import { Injectable, tokenId } from '@tsdi/ioc';
import { AssetServerContext } from '../../asset.ctx';
import { hdr } from '../../consts';
import { UdpServRequest } from './request';
import { UdpServResponse } from './response';



/**
 * UDP context.
 */
@Injectable()
export class UdpContext extends AssetServerContext<UdpServRequest, UdpServResponse> implements HeaderContext, AssetContext {
    get writable(): boolean {
        throw new Error('Method not implemented.');
    }


    isUpdate(): boolean {
        return this.request.method === 'PUT' || this.getHeader(hdr.OPERATION) === 'update';
    }

    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    set statusMessage(msg: string) {
        throw new Error('Method not implemented.');
    }
    
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }

    get status(): number {
        return this.response.status
    }
    set status(status: number) {
        this.response.status = status;
    }
}

/**
 * TCP Middlewares.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike<UdpContext>[]>('TCP_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');
