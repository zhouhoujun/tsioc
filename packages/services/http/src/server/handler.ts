import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler } from '@tsdi/endpoints';
import { HttpContext } from './context';
import { HttpServerOpts } from './options';

@Abstract()
export abstract class HttpRequestHandler extends AbstractRequestHandler<HttpContext, HttpServerOpts> {
    
}
