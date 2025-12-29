import { ContextToken, ProvdierOf, Provider } from '@tsdi/ioc';
import { defer, map, mergeMap } from 'rxjs';
import { RequestInterceptorFn, RequestInterceptorLike } from './interceptor';
import { TransportConfig } from './protocols';
import { RequestContext } from './context';
import { StreamAdapter } from './StreamAdapter';

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

export interface TransferOptions {
    eventName?: string;
    delimiter?: string;
    maxSize?: number;
    limitSize?: number;

    idSize?: number;
    /**
     * packet with size.
     */
    size?: number;

}

export interface TransferConfig extends TransportConfig {
    side: TransferSide;
    transfer?: TransferOptions;
    providers?: Provider[];
}


export interface TransferFeature<Kind extends TransferFeatureKind> {
    kind: Kind;
    config?: TransferConfig;
    providers: Provider[];
}

export function makeTransferFeature<T extends TransferFeatureKind>(kind: T, providers: Provider[], config?: TransferConfig): TransferFeature<T> {
    return {
        kind,
        config,
        providers
    }
}


export interface TransferInterceptorFactory {
    (side: TransferConfig): ProvdierOf<RequestInterceptorLike> | ProvdierOf<RequestInterceptorLike>[];
}

export interface StringTransferOptions {
    type: 'string';
    codings?: string;
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}

export interface JsonTransferOptions {
    type: 'json';
    payloadKey?: 'payload' | 'body';
    /**
     * custom packet unpacket.
     */
    packet?: TransferOptions;
}

export interface StreamTransferOptions {
    type: 'stream';

}


export type TransferFactoryOptions = StringTransferOptions | JsonTransferOptions | StreamTransferOptions | TransferInterceptorFactory[];


export const PAYLOAD_KEY = new ContextToken<string>(() => 'body');


export function useSimpleJson(options?: {
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
    return (config) => {
        const interceptor: RequestInterceptorFn = config.side === TransferSide.client ? (req, next, context) => {
            const reqdata = JSON.stringify(options?.mapping ? options.mapping(req, context) : req, options?.replacer, options?.space);
            return next(reqdata, context)
                .pipe(
                    mergeMap(async res => {
                        const streamAdapter = context.get(StreamAdapter);
                        if (streamAdapter.isReadable(res)) {
                            res = await streamAdapter.read(res);
                        }
                        return JSON.parse(res, options?.reviver);
                    })
                )
        }
            :
            (req, next, context) => {
                return defer(async () => {
                    const streamAdapter = context.get(StreamAdapter);
                    if (streamAdapter.isReadable(req)) {
                        req = await streamAdapter.read(req);
                    }
                    const reqdata = JSON.parse(req, options?.reviver);
                    return reqdata;
                })
                    .pipe(
                        mergeMap(rjson => next(rjson, context)),
                        map(res => JSON.stringify(options?.mapping ? options?.mapping(res, context) : res, options?.replacer, options?.space))
                    )
            };

        return interceptor;
    }

}
