import { Injectable, isString } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from '@tsdi/common/client';
import { CoapRequest } from '../request';
import { ResponseEvent } from '@tsdi/common';
import { CoapClientConfig } from '../options';

/**
 * CoAP Transport Strategy
 * Lightweight UDP-based transport strategy for CoAP using `coap` module's Agent.
 */
@Injectable()
export class CoapTransportStrategy implements IClientTransportStrategy<CoapRequest<any>, ResponseEvent<any>, CoapClientConfig> {
    private _connected = false;

    // Connect to transport (no persistent connection establishment for UDP/CoAP is needed here)
    connect(): Promise<void> {
        this._connected = true;
        return Promise.resolve();
    }

    createRequest(pattern: any, options: any): CoapRequest<any> {
        if (isString(pattern)) {
            return new CoapRequest(pattern, null, options);
        } else {
            // Attempt to stringify non-string pattern for URL and pass original pattern as pattern
            return new CoapRequest((pattern as any).toString(), pattern, options);
        }
    }

    initContext(context: any, request: CoapRequest<any>): void {
        // No special per-request context initialization needed for CoAP in this minimal strategy
        // Kept for API compatibility with IClientTransportStrategy
        context.set ? context.set('COAP_REQUEST', request) : undefined;
    }

    onShutdown(): Promise<void> {
        // Cleanup any resources if needed in future; currently a no-op
        this._connected = false;
        return Promise.resolve();
    }

    getConfig(): CoapClientConfig {
        // Best-effort: configuration is typically provided via DI tokens.
        // If not available at runtime, return an empty config as a safe default.
        return {} as CoapClientConfig;
    }

    isConnected(): boolean {
        return this._connected;
    }
}
