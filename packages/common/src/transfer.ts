import { ProvdierOf } from '@tsdi/ioc';
import { map } from 'rxjs';
import { RequestInterceptorLike } from './interceptor';

export enum TransferSide {
    client = 1,
    server,
}



export interface TransferInterceptorSelector {
    (side: TransferSide): ProvdierOf<RequestInterceptorLike> | ProvdierOf<RequestInterceptorLike>[];
}


export function withJsonPacket(options?: {
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}): TransferInterceptorSelector {
    return (side) =>
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

}

