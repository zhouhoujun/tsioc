import { Injectable } from '@tsdi/ioc';
import { ContentType, RequestContext, RequestExceptionFilter } from '@tsdi/common';
import { Observable, of } from 'rxjs';


@Injectable()
export class FinallizeFilter extends RequestExceptionFilter {
    catchError(input: any, err: any, context: RequestContext): Observable<any> {
        const res = context.getResponse();
        res.statusCode = err.status ?? err.statusCode;
        res.statusMessage = err.statusMessage;
        res.error = err;
        context.setContentType(ContentType.APPL_JSON);
        context.setContentLength(0);
        return of(res);
    }

}