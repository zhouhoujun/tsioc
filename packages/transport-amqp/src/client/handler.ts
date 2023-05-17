import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * Amqp handler.
 */
@Abstract()
export abstract class AmqpHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
