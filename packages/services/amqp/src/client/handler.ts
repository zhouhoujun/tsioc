import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';


/**
 * Amqp handler.
 */
@Abstract()
export abstract class AmqpHandler extends ClientHandler {

}
