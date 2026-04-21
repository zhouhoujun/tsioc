import { RequestContext, RequestExceptionFilter } from '@tsdi/common';
import { Observable } from 'rxjs';
export declare class FinallizeFilter extends RequestExceptionFilter {
    catchError(input: any, err: any, context: RequestContext): Observable<any>;
}
