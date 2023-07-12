import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { WS_SERV_OPTS } from './options';



@Injectable({ static: true })
export class WsExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(WS_SERV_OPTS).detailError == true
    }

}