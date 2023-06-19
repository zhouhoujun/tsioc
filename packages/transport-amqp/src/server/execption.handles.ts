import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { AMQP_SERV_OPTS } from './options';


@Injectable({ static: true })
export class AmqpExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(AMQP_SERV_OPTS).detailError == true
    }

}
