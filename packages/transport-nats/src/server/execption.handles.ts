import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { NATS_SERV_OPTS } from './options';


@Injectable({ static: true })
export class NatsExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(NATS_SERV_OPTS).detailError == true
    }

}
