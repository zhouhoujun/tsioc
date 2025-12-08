import { Abstract } from '@tsdi/ioc';
import { RequestHandler } from '@tsdi/common';
import { HttpContext, HttpServRequest, HttpServResponse } from './context';
import { Observable } from 'rxjs';

@Abstract()
export abstract class HttpHandler implements RequestHandler<HttpServRequest, HttpServResponse, HttpContext> {
    abstract handle(input: HttpServRequest, context: HttpContext): Observable<HttpServResponse>;
}
