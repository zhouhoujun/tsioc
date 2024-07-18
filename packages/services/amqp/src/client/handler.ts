import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { ResponseEvent } from '@tsdi/common';
import { AmqpClientOpts } from './options';
import { AmqpRequest } from './request';


/**
 * Amqp handler.
 */
@Abstract()
export abstract class AmqpHandler extends ClientHandler<AmqpRequest<any>, ResponseEvent<any>, AmqpClientOpts> {

}
