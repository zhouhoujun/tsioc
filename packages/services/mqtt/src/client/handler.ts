import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { MqttRequest } from './request';


@Abstract()
export abstract class MqttHandler extends ClientHandler<MqttRequest<any>> {

}
