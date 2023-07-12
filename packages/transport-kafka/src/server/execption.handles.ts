import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { KAFKA_SERV_OPTS } from './options';


@Injectable({ static: true })
export class KafkaExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(KAFKA_SERV_OPTS).detailError == true
    }

}