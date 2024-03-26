import { Abstract } from '@tsdi/ioc';
import { EndpointHandler } from '@tsdi/endpoints';
import { HttpContext } from './context';
import { HttpServerOpts } from './options';

@Abstract()
export abstract class HttpEndpointHandler extends EndpointHandler<HttpContext, HttpServerOpts> {
    
}
