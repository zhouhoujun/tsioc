import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Endpoint, EndpointBackend } from '../Endpoint';
import { Interceptor } from '../Interceptor';
import { InterceptorHandler } from './handler';


/**
 * abstract endpoint.
 */
@Abstract()
export abstract class AbstractEndpoint<TCtx extends InvocationContext = InvocationContext, TOutput = any> implements Endpoint<TCtx, TOutput> {

    private chain: Endpoint<TCtx, TOutput> | null = null;

    handle(context: TCtx): Observable<TOutput> {
        return this.getChain().handle(context);
    }

    protected getChain(): Endpoint<TCtx, TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain;
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): Endpoint<TCtx, TOutput> {
        return this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), this.getBackend());
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): EndpointBackend<TCtx, TOutput>;

    /**
     *  get interceptors. 
     */
    protected abstract getInterceptors(): Interceptor<TCtx, TOutput>[];
}


