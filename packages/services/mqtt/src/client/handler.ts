import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';


@Abstract()
export abstract class MqttHandler extends ClientHandler {

}
