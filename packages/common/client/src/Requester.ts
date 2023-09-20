import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Sender, Receiver } from '@tsdi/common';

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
