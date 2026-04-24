import { Injectable } from '@tsdi/ioc';

// Local protocol factory interface (kept lightweight for now)
export interface IProtocolFactory {
    createProtocol(): any;
}

/** CoAP Protocol Factory
 * Minimal implementation to satisfy the interface requirement. */
@Injectable()
export class CoapProtocolFactory implements IProtocolFactory {
    createProtocol(): any {
        // Return a minimal protocol description object; this can be extended later
        return {
            name: 'coap',
            version: '1.0.0'
        };
    }
}
