import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { TCP_SERV_OPTS } from './options';



@Injectable({ static: true })
export class TcpExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(TCP_SERV_OPTS).detailError == true
    }

}
