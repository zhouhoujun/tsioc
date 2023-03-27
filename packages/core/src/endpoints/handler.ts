import { Observable } from 'rxjs';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';


/**
 * Interceptor Handler.
 */
export class InterceptorHandler<TInput, TOutput = any> implements Handler<TInput, TOutput> {

    constructor(private next: Handler<TInput, TOutput>, private interceptor: Interceptor<TInput, TOutput>) { }

    handle(context: TInput): Observable<TOutput> {
        return this.interceptor.intercept(context, this.next)
    }
}