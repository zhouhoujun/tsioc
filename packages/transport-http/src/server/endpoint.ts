import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint } from '@tsdi/core';
import { HttpContext, HttpServResponse } from './context';

@Abstract()
export abstract class HttpEndpoint extends TransportEndpoint<HttpContext, HttpServResponse> {
    
}