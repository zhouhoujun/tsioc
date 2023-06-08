import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { COAP_SERV_OPTS } from './options';


@Injectable({ static: true })
export class CoapExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(COAP_SERV_OPTS).detailError == true
    }

}
