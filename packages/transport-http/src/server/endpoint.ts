import { Abstract } from '@tsdi/ioc';
import { MiddlewareEndpoint } from '@tsdi/core';
import { HttpContext, HttpServResponse } from './context';

@Abstract()
export abstract class HttpEndpoint extends MiddlewareEndpoint<HttpContext, HttpServResponse> {
    
}