import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { REDIS_SERV_OPTS } from './options';


@Injectable({ static: true })
export class RedisExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(REDIS_SERV_OPTS).detailError == true
    }

}
