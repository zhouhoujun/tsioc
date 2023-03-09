import { ArgumentExecption, EMPTY, Injector, isFunction, isType, lang, Token, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Endpoint, EndpointBackend } from '../Endpoint';
import { CatchInterceptor, ExecptionBackend, ExecptionFilter } from './execption.filter';
import { EndpointFilter, FilterChain } from './filter';
import { Interceptor, InterceptorChain } from '../Interceptor';
import { EndpointContext } from './context';




export class Endpointor<TInput = any, TOutput = any> {

    private _chain?: Endpoint<TInput, TOutput>;
    private _expFilter?: Endpoint;
    constructor(private injector: Injector,
        private token: Token<Interceptor<TInput, TOutput>[]>,
        private backend: TypeOf<EndpointBackend<TInput, TOutput>>,
        private expFilterToken: Token<ExecptionFilter[]>,
        private execptionBackend: TypeOf<ExecptionBackend>) {

    }

    use(interceptor: TypeOf<Interceptor<TInput, TOutput>>, order?: number): this {
        this.multiOrder(this.token, interceptor, order);
        this._chain = null!;
        return this;
    }

    getEndpoint(): Endpoint<TInput, TOutput> {
        if (!this._chain) {
            this.useExecptionFilter(CatchInterceptor,  0);
            this._chain = this.buildEndpoint();
        }
        return this._chain

    }

    invoke(input: TInput, context: EndpointContext): Observable<TOutput> {
        return this.getEndpoint().handle(input, context);
    }


    /**
     * execption filter chain.
     */
    execptionfilter(): Endpoint {
        if (!this._expFilter) {
            this._expFilter = new FilterChain(this.getExecptionBackend(), this.injector.get(this.expFilterToken, EMPTY));
        }
        return this._expFilter;
    }

    /**
     * use execption filter.
     * @param filter 
     */
    useExecptionFilter(filter: TypeOf<EndpointFilter>, order?: number): this {
        if (!this.expFilterToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options execptionsToken is missing.');
        }
        this.multiOrder(this.expFilterToken, filter, order);
        this._expFilter = null!;
        return this;
    }


    protected buildEndpoint(): Endpoint<TInput, TOutput> {
        return new InterceptorChain(this.getBackend(), this.injector.get(this.token, EMPTY));
    }

    /**
     *  get backend endpoint. 
     */
    protected getBackend(): EndpointBackend {
        return isFunction(this.backend) ? this.injector.get(this.backend) : this.backend;
    }

    /**
     *  get backend endpoint. 
     */
    protected getExecptionBackend(): ExecptionBackend {
        return isFunction(this.execptionBackend) ? this.injector.get(this.execptionBackend) : this.execptionBackend;
    }


    protected multiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
        if (isType(target)) {
            this.injector.inject({ provide, useClass: target, multi: true, multiOrder })
        } else {
            this.injector.inject({ provide, useValue: target, multi: true, multiOrder })
        }
    }


}

