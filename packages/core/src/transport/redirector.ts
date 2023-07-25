import { ResHeaders, TransportRequest } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = number> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: TransportRequest, status: TStatus, headers: ResHeaders): Observable<T>
}

