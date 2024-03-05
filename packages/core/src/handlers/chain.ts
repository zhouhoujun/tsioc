import { Abstract, ArgumentExecption, EMPTY, Injector, isArray, ProvdierOf, Token, toProvider, getClassName } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Interceptor, InterceptorService } from '../Interceptor';
import { Backend, Handler } from '../Handler';
import { InterceptorHandler } from './handler';


/**
 * abstract handler.
 * 
 * 抽象处理器。
 */
@Abstract()
export abstract class AbstractHandler<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {

    private chain: Handler<TInput, TOutput> | null = null;

    handle(context: TInput): Observable<TOutput> {
        return this.getChain().handle(context);
    }

    protected getChain(): Handler<TInput, TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain;
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): Handler<TInput, TOutput> {
        return this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), this.getBackend());
    }

    /**
     *  get backend endpoint. 
     */
    protected abstract getBackend(): Backend<TInput, TOutput>;

    /**
     *  get interceptors. 
     */
    protected abstract getInterceptors(): Interceptor<TInput, TOutput>[];
}


/**
 * Simple Endpoint chain. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export class Handlers<TInput = any, TOutput = any> extends AbstractHandler<TInput, TOutput> {

    constructor(
        protected readonly backend: Backend<TInput, TOutput>,
        protected readonly interceptors: Interceptor<TInput, TOutput>[]) {
        super()
    }

    protected getBackend(): Backend<TInput, TOutput> {
        return this.backend;
    }

    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        return this.interceptors;
    }

}


/**
 * Dynamic handler. for composing interceptors. Requests will
 * traverse them in the order they're declared. That is, the first endpoint
 * is treated as the outermost interceptor.
 */
export abstract class DynamicHandler<TInput = any, TOutput = any> extends AbstractHandler<TInput, TOutput> implements InterceptorService {

    constructor(
        readonly injector: Injector,
        protected interceptorToken: Token<Interceptor<TInput, TOutput>[]>) {
        super();
        if (!interceptorToken) throw new ArgumentExecption(`Interceptor token missing of ${getClassName(this)}.`)
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this {
        this.regMulti(this.interceptorToken, interceptor, order);
        this.reset();
        return this;
    }

    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        return this.injector.get(this.interceptorToken, EMPTY);
    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number, isClass?: (type: Function) => boolean) {
        const multi = true;
        if (isArray(providers)) {
            this.injector.inject(providers.map((r, i) => toProvider(token, r, { multi, multiOrder, isClass })))
        } else {
            this.injector.inject(toProvider(token, providers, { multi, multiOrder, isClass }));
        }
    }

}