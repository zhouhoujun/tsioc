import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { InterceptorChain, Endpoint, EndpointBackend, MiddlewareBackend, MiddlewareInst, Interceptor } from './endpoint';
import { TransportContext } from './context';
import { MiddlewareSet } from './middlware.set';
import { from, Subscription } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { ExecptionContext, ExecptionFilter } from '../execptions';


/**
 * abstract transport server.
 */
@Abstract()
@Runner('start')
export abstract class TransportServer<TRequest, TResponse, Tx extends TransportContext = TransportContext> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;

    protected _chain?: Endpoint<TRequest, TResponse>;
    private _middset?: MiddlewareSet<Tx>;

    /**
     * server context.
     */
    abstract get context(): InvocationContext;

    /**
     * get interceptors.
     */
    abstract getInterceptors(): Interceptor[];

    /**
     * Get middleware set.
     */
    get middlewares(): MiddlewareSet<Tx> {
        if (!this._middset) {
            this._middset = this.createMidderwareSet();
        }
        return this._middset;
    }

    /**
     * start server.
     */
    abstract start(): Promise<void>;
    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareInst<Tx>, order?: number): this {
        this.middlewares.use(middleware, order);
        return this;
    }

    /**
     * transport endpoint chain.
     */
    chain(): Endpoint<TRequest, TResponse> {
        if (!this._chain) {
            this._chain = new InterceptorChain(new MiddlewareBackend(this.getBackend(), this.middlewares.getAll()), this.getInterceptors());
        }
        return this._chain;
    }

    /**
     * get backend endpoint.
     */
    protected abstract getBackend(): EndpointBackend<TRequest, TResponse>;
    /**
     * lazy create context.
     */
    protected abstract createContext(request: TRequest, response: TResponse): Tx;
    /**
     * lazy create middleware set.
     */
    protected abstract createMidderwareSet(): MiddlewareSet<Tx>;


    protected requestHandler(request: TRequest, response: TResponse) {
        const ctx = this.createContext(request, response) as Tx;
        ctx.setValue(Logger, this.logger);

        const cancel = this.chain().handle(request, ctx)
            .pipe(
                mergeMap(res => this.respond(res, ctx)),
                catchError((err, caught) => {
                    // log error
                    this.logger.error(err);
                    // handle error
                    const filter = this.getExecptionFilter(ctx);
                    const context = ExecptionContext.create(ctx, err);
                    return from(filter.handle(context, async () => {
                        return await context.destroy();
                    }));
                })
            )
            .subscribe({
                complete: () => {
                    ctx.destroy();
                }
            });

        this.bindEvent(ctx, cancel);
    }

    protected getExecptionFilter(ctx: Tx): ExecptionFilter {
        return ctx.injector.get(ExecptionFilter);
    }

    protected abstract bindEvent(ctx: Tx, cancel: Subscription): void;

    protected abstract respond(res: TResponse, ctx: Tx): Promise<any>;

    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}
