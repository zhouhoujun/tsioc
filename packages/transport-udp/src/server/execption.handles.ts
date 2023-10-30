import { Injectable } from '@tsdi/ioc';
import { AssetContext, TransportExecptionHandlers } from '@tsdi/transport';
import { UDP_SERV_OPTS } from './options';



@Injectable({ static: true })
export class UdpExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(UDP_SERV_OPTS).detailError == true
    }

}
