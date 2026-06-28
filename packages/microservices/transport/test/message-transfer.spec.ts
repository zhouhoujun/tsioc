import expect = require('expect');
import { TransferSide, TransferConfig } from '@tsdi/common';
import { useBrokerMessageTransfer, useBrokerClientTransfer, BrokerClientMessageTransferOptions } from '../src/message-transfer';

describe('useBrokerMessageTransfer', () => {
    it('returns empty for client side', () => {
        const factory = useBrokerMessageTransfer({ normalize: (i: any) => i });
        const config: TransferConfig = { side: TransferSide.client, features: {} } as any;
        const result = factory(config);
        expect(result).toEqual([]);
    });

    it('server side creates interceptor with filters', () => {
        const factory = useBrokerMessageTransfer({
            normalize: (input: any) => input,
            sender: { send: (response: any, context: any) => {} }
        });
        const config: TransferConfig = { side: TransferSide.server, features: {} } as any;
        const result = factory(config) as any;
        expect(result).toBeDefined();
        expect(result.filters).toBeDefined();
        expect(result.filters.length).toBe(2);
    });
});

describe('useBrokerClientTransfer', () => {
    it('returns empty for server side', () => {
        const factory = useBrokerClientTransfer();
        const config: TransferConfig = { side: TransferSide.server, features: {} } as any;
        const result = factory(config);
        expect(result).toEqual([]);
    });

    it('client side creates filters', () => {
        const factory = useBrokerClientTransfer();
        const config: TransferConfig = { side: TransferSide.client, features: {} } as any;
        const result = factory(config) as any;
        expect(result).toBeDefined();
        expect(result.filters).toBeDefined();
        expect(result.filters.length).toBe(2);
    });
});
