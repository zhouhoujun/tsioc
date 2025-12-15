import { TransferInterceptorFactory } from '@tsdi/common';
import { delimiterPacket, delimiterUnpacket } from './interceptors';

const defaultOptions = {
    delimiter: '\r\n',
    idSize: 2
}

export function usePacket(options: {
    delimiter?: string,
    idSize?: number;
    maxSize?: number;
    limitSize?: number;
} = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        return [
            delimiterUnpacket(config, options),
            delimiterPacket(config, options)
        ]
    }
}