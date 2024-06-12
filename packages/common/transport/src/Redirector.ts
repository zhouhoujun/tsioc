import { Abstract } from '@tsdi/ioc';
import { AbstractRequest, IHeaders } from '@tsdi/common';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: AbstractRequest, status: TStatus, headers: IHeaders): Observable<T>
}

