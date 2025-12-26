import { TransferInterceptorFactory, TransferOptions } from '@tsdi/common';
import { delimiterPacket, delimiterUnpacket, socketMessage } from './interceptors';

const defaultOptions = {
    delimiter: '\r\n',
    idSize: 2
}

export function usePacket(options: TransferOptions = {}): TransferInterceptorFactory {
    return (config) => {
        options = { ...defaultOptions, ...config.transfer, ...options };

        return [
            socketMessage(config, options),
            delimiterUnpacket(config, options),
            delimiterPacket(config, options)
        ]
    }
}