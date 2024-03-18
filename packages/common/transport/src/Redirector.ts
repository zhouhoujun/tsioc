import { HeaderRecord, TransportRequest } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Redirector<TStatus = any> {
    /**
     * redirect.
     */
    abstract redirect<T>(req: TransportRequest, status: TStatus, headers: HeaderRecord): Observable<T>
}

