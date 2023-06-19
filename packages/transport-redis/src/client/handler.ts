import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * Redis handler.
 */
@Abstract()
export abstract class RedisHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
