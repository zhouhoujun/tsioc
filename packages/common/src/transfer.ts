import { Abstract, ComposeInterceptor } from '@tsdi/ioc';
import { map, Observable } from 'rxjs';
import { RequestContext } from './context';
import { RequestInterceptorLike } from './interceptor';

export enum TransferSide {
    client = 1,
    server,
}



@Abstract()
export abstract class Transfer<TRequest, TResponse, TContext extends RequestContext = RequestContext> extends ComposeInterceptor<TRequest, TResponse, TContext> {
    abstract get side(): TransferSide;
    abstract transform(input: TRequest, context: TContext): Observable<TResponse>;

    withJson(options?: {
        reviver?: (this: any, key: string, value: any) => any;
        replacer?: ((this: any, key: string, value: any) => any);
        space?: string | number;
    }): this {
        this.interceptors.push(...withJson(this.side, options))
        return this;
    }

    abstract withPacket(): this;
}


export function withJson(side: TransferSide, options?: {
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}): RequestInterceptorLike[] {
    return [
        side === TransferSide.client ? (req, next, context) => {
            const reqdata = JSON.stringify(req, options?.replacer, options?.space);
            return next(reqdata, context)
                .pipe(
                    map(res => JSON.parse(res, options?.reviver))
                )
        }
            :
            (req, next, context) => {
                const reqdata = JSON.parse(req, options?.reviver);
                return next(reqdata, context)
                    .pipe(
                        map(res => JSON.stringify(res, options?.replacer, options?.space))
                    )
            }
    ]
}

