import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * Coap handler.
 */
@Abstract()
export abstract class CoapHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
