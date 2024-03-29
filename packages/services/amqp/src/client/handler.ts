import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { AmqpClientOpts } from './options';


/**
 * Amqp handler.
 */
@Abstract()
export abstract class AmqpHandler extends ClientHandler<TransportRequest, TransportEvent, AmqpClientOpts> {

}
