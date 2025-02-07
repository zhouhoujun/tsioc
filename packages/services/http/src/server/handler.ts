import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, HttpServerOpts } from '@tsdi/endpoints';
import { HttpContext } from './context';

@Abstract()
export abstract class HttpRequestHandler extends AbstractRequestHandler<HttpContext, HttpServerOpts> {
    
}
