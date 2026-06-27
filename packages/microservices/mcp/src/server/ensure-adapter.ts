import { Injectable } from '@tsdi/ioc';
import { MessageAdapter, REQUEST, RequestContext, RequestFilter } from '@tsdi/common';
import { Observable, of } from 'rxjs';
import { McpMessageAdapterFactory } from './message-adapter.factory';
import { MCP_RESPONSE } from './mcp-server';

@Injectable()
export class McpEnsureAdapterFilter extends RequestFilter<any, Observable<any>, RequestContext> {
    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        if (!context.has(MessageAdapter)) {
            const factory = context.getInjector()?.get(McpMessageAdapterFactory);
            const requestData = context.get(REQUEST);
            const mcpResponse = context.get(MCP_RESPONSE);
            if (factory && requestData && mcpResponse) {
                context.setMessageAdapter(factory.create({ request: requestData, response: mcpResponse, context }));
            }
        }
        return next.handle(input, context);
    }
}
