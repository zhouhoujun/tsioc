import { Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { runHandlers } from '../handlers/runs';
import { FilterHandlerResolver } from './filter';
import { EndpointContext } from '../endpoints/context';

/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runFilters(ctx: EndpointContext, filter: Type | string): Observable<any> {
    const handles = ctx.injector.get(FilterHandlerResolver).resolve(filter);
    return runHandlers(handles, ctx, c => c.isDone?.())
}
