import { Abstract } from '@tsdi/ioc';
import { AbstractRequest, HeadersLike } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: AbstractRequest<any>, status: TStatus, headers: HeadersLike): Observable<T>
}

