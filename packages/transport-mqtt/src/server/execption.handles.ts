import { Injectable } from '@tsdi/ioc';
import { AssetContext, TransportExecptionHandlers } from '@tsdi/transport';
import { MQTT_SERV_OPTS } from './options';


@Injectable({ static: true })
export class MqttExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: AssetContext): boolean {
        return ctx.get(MQTT_SERV_OPTS).detailError == true
    }

}
