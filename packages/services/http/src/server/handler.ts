import { Abstract } from '@tsdi/ioc';
import { EndpointHandler } from '@tsdi/endpoints';
import { HttpContext, HttpServResponse } from './context';

@Abstract()
export abstract class HttpEndpointHandler extends EndpointHandler<HttpContext, HttpServResponse> {
    
}
