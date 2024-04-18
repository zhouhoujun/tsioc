import { Abstract } from '@tsdi/ioc';
import { ConfigableHandler } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { HttpClientOpts } from './options';


@Abstract()
export abstract class HttpHandler extends ConfigableHandler<HttpRequest, HttpEvent, HttpClientOpts> {

}
