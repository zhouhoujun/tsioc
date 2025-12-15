import { HeaderAdapter, PAYLOAD_KEY, StreamAdapter, TransferInterceptorFactory, TransferSide } from '@tsdi/common';
import { isString } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { map } from 'rxjs';

const defaultOptions = {
    delimiter: '\n',
    idSize: 2
}

export function usePacket(options: {
    delimiter?: string,
    idSize?: number;
    maxSize?: number;
    limitSize?: number;
} = {}): TransferInterceptorFactory {
    options = { ...defaultOptions, ...options };
    return (config) => {
        if (config.side === TransferSide.client) {
            return (req, next, context) => {
                if (Buffer.isBuffer(req)) {
                    req = Buffer.concat([req, Buffer.from(options.delimiter!)]);
                } else if(isString(req)) {
                    req = req + options.delimiter!;
                }
                
                return next(req, context)
                    .pipe(
                        map(res => JSON.parse(res))
                    )
            }
        } else {
            return (req, next, context) => {
                const reqdata = JSON.parse(req);
                return next(reqdata, context)
                    .pipe(
                        map(res => JSON.stringify(res))
                    )
            }
        }
    }
}