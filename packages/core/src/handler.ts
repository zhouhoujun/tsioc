import { AbstractType, Context, ContextToken, Handler, Injector, isBoolean, ResolveContext, TailNext } from '@tsdi/ioc';
import { Observable } from 'rxjs';

export { Handler, HandlerLike, HandlerFn } from '@tsdi/ioc';


const BOOTSTRAP = new ContextToken<boolean>(() => false);

export class RunableContext extends ResolveContext {

    constructor(injector: Injector,
        bootstrap?: boolean,
        failed?: (target: AbstractType, propertyKey: string) => void) {
        super(injector, failed)
        if (isBoolean(bootstrap)) this.set(BOOTSTRAP, bootstrap);
    }

    getBootstrap() {
        return this.get(BOOTSTRAP);
    }
}


export function createRunableContext(injector: Injector,
    bootstrap?: boolean,
    failed?: (target: AbstractType, propertyKey: string) => void) {
    return new RunableContext(injector, bootstrap, failed)
}


export interface RequestHandler<TInput = any, TOutput = any, TContext extends Context = Context> extends Handler<TInput, TOutput, TContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     * @param tail next tail.
     */
    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): Observable<TOutput>;
}

export type RequestHandlerFn<TInput = any, TOutput = any, TContext extends Context = Context> = (input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>) => Observable<TOutput>;


/**
 * Request handler like.
 */
export type RequestHandlerLike<TInput = any, TOutput = any, TContext extends Context = Context> = RequestHandlerFn<TInput, TOutput, TContext> | RequestHandler<TInput, TOutput, TContext>;

