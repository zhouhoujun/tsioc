import { MessageAdapter, TransferFilterFactory, TransferSide } from '@tsdi/common';
import { useJsonPacket, SOCKET } from '@tsdi/transport';
import { TcpMessageAdapterFactory } from './message-adapter.factory';

function useTcpMessageTransfer(): TransferFilterFactory {
    return (config) => {
        if (config.side === TransferSide.client) {
            return useJsonPacket()(config) as any;
        }
        const ensureAdapter = (_input: any, next: any, context: any) => {
            if (!context.has(MessageAdapter)) {
                const socket = context.get(SOCKET) as any;
                const factory = context.getInjector()?.get(TcpMessageAdapterFactory) as any;
                if (factory && socket) {
                    context.setMessageAdapter(factory.create({ request: socket, response: socket, context }));
                }
            }
            return next(_input, context);
        };
        const jsonFilters = useJsonPacket()(config) as any[];
        return [ensureAdapter, ...jsonFilters] as any;
    };
}

export { useTcpMessageTransfer };
