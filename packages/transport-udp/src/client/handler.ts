import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * UDP handler.
 */
@Abstract()
export abstract class UdpHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
