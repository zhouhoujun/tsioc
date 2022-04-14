import { Abstract } from '@tsdi/ioc';
import { Endpoint } from './endpoint';
import { RequestBase, ResponseBase } from './packet';

@Abstract()
export abstract class Subscriber<TRequest extends RequestBase, TResponse extends ResponseBase> {

    /**
     * transport handler.
     */
     abstract getEndpoint(): Endpoint<TRequest, TResponse>;

}
