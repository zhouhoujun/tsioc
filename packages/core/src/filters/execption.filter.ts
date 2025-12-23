import { Abstract, Exception, Injectable, isUndefined, composeHandlers, invokeTail, HandleResult } from '@tsdi/ioc';
import { Handler, RunContext } from '../handler';
import { Filter, FilterHandlerResolver } from './filter';


/**
 * execption filter
 * 
 * 异常处理过滤器
 */
@Abstract()
export abstract class ExceptionFilter<TInput = any, TOutput = any, TContext extends RunContext = RunContext> extends Filter<TInput, TOutput, TContext> {
    /**
     * execption filter.
     * @param context execption context.
     * @param next The next interceptor in the chain, or the backend
     * @returns any
     */
    doFilter(input: TInput, next: Handler<TInput, TOutput>, context: TContext): HandleResult<TOutput> {
        return invokeTail(()=> next.handle(input, context), {
            error: (err) => {
                return invokeTail(() => this.catchError(input, err, context), {
                    next: (res) => {
                        if (res instanceof Error || res instanceof Exception) {
                            throw res;
                        }
                        return res;
                    },
                    error: (err) => { throw err }
                })
            }
        })
    }

    /**
     * catch error.
     * @param err 
     * @param caught 
     */
    abstract catchError(input: TInput, err: any, context: TContext): HandleResult<TOutput>;
}

/**
 * execption handler filter.
 */
@Injectable({ static: true })
export class ExceptionHandlerFilter<TInput, TOutput = any, TContext extends RunContext = RunContext> extends ExceptionFilter<TInput, TOutput, TContext> {


    catchError(input: TInput, err: any, context: TContext): HandleResult<TOutput> {
        const injector = context.getInjector();
        const handlers = injector.get(FilterHandlerResolver)?.resolve(err);
        if (!handlers || !handlers.length) {
            return err;
        }

        return invokeTail(
            composeHandlers(handlers, (res, next, input, context) => {
                if (isUndefined(res)) {
                    return next(err, context)
                }
                return res;
            }),
            {
                error: (err1) => {
                    err1.originException = err;
                    err1.message = `${err1.message}\r\n${err.toString()}`;
                    throw err1;
                }
            }, err, context);
    }

}
