import { Injectable } from '@tsdi/ioc';
import { AssetContext, TransportExecptionHandlers } from '@tsdi/transport';
import { NATS_SERV_OPTS } from './options';


@Injectable({ static: true })
export class NatsExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(NATS_SERV_OPTS).detailError == true
    }

}
