import { Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { runSequence } from '../handlers/runs';
import { HandlerContext } from '../handlers/context';
import { FilterHandlerResolver } from './filter';

/**
 * run handlers.
 * @param input 
 * @param filter 
 * @returns 
 */
export function runFilters<TInput extends HandlerContext, TContext = any>(input: TInput, filter: Type | string, context?: TContext): Observable<any> {
    const handles = input.injector.get(FilterHandlerResolver).resolve(filter);
    return runSequence(handles, input, context, c => c.isDone?.())
}
