import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';


@Abstract()
export abstract class NatsHandler extends ClientHandler {

}
