import { Abstract } from '@tsdi/ioc';
import { EndpointHandler } from '@tsdi/endpoints';
import { HttpContext, HttpServResponse } from './context';

@Abstract()
export abstract class HttpEndpoint extends EndpointHandler<HttpContext, HttpServResponse> {
    
}
