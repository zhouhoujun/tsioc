import { ContextToken, ProvdierOf, Provider } from '@tsdi/ioc';
import { map } from 'rxjs';
import { RequestInterceptorLike } from './interceptor';
import { TransportConfig } from './protocols';
import { RequestContext } from './context';

export enum TransferSide {
    client = 1,
    server,
}

export enum TransferFeatureKind {
    UnPacket,
    Decode,
    Deserialize,
    Serialize,
    Encode,
    Packet
}

export interface TransferConfig extends TransportConfig {
    side: TransferSide;
}


export interface TransferFeature<Kind extends TransferFeatureKind> {
    kind: Kind;
    config?: TransferConfig;
    providers: Provider[];
}


export interface TransferInterceptorFactory {
    (side: TransferConfig): ProvdierOf<RequestInterceptorLike> | ProvdierOf<RequestInterceptorLike>[];
}

export const PAYLOAD_KEY = new ContextToken<string>(() => 'body');


export function withSimpleJson(options?: {
    /**
     * parse value to simple mapping json.
     * @param value 
     * @returns 
     */
    mapping?: (value: any, context: RequestContext) => any,
    reviver?: (this: any, key: string, value: any) => any;
    replacer?: ((this: any, key: string, value: any) => any);
    space?: string | number;
}): TransferInterceptorFactory {
    return (config) =>
        config.side === TransferSide.client ? (req, next, context) => {
            const reqdata = JSON.stringify(options?.mapping ? options.mapping(req, context) : req, options?.replacer, options?.space);
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
                        map(res => JSON.stringify(options?.mapping ? options?.mapping(res, context) : res, options?.replacer, options?.space))
                    )
            }

}

