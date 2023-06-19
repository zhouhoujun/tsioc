import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * WS handler.
 */
@Abstract()
export abstract class WsHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
