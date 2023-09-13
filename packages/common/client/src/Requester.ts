import { Receiver, Sender } from '@tsdi/common';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Requester.
 */
@Abstract()
export abstract class Requester<TRequest, TResponse> {

    /**
     * packet sender
     */
    abstract get sender(): Sender;

    /**
     * packet receiver.
     */
    abstract get receiver(): Receiver;

    /**
     * request
     * @param req 
     */
    abstract request(req: TRequest): Observable<TResponse>;
}
