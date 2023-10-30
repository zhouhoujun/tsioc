import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';


@Abstract()
export abstract class GrpcHandler extends ConfigableHandler<HttpRequest, HttpEvent> {

}
