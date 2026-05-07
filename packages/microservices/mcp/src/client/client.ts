import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable, switchMap } from 'rxjs';
import { MCP_CLIENT_OPTIONS, McpClientOptions } from './options';
import { McpRequest } from './request';

@Injectable()
export class McpClient extends AbstractClient<McpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    constructor(
        readonly handler: ClientHandler<McpRequest<any>, ResponseEvent<any>>,
        @Inject(MCP_CLIENT_OPTIONS, { nullable: true }) private options: McpClientOptions
    ) { super(); }

    protected connect(): Observable<any> {
        return defer(async () => ({ connected: true }));
    }

    protected initContext(context: Context, req: McpRequest<any>): void {
        context.set(McpClient, this);
        context.set(McpRequest, req);
    }

    protected buildRequest(first: McpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): McpRequest<any> {
        if (first instanceof McpRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'CALL';
        if (isString(first)) return new McpRequest(first, null, options, defaultMethod);
        else return new McpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
    }

    protected override request(first: Pattern | McpRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(switchMap(() => super.request(first, options)));
    }

    protected async onShutdown(): Promise<void> {}

    protected isValid(_connection: any): boolean { return true; }
}
