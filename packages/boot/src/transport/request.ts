import { TransportServer, Deserializer, TransportEvent, TransportRequest } from '@tsdi/core';
import { isUndefined, ProviderIn } from '@tsdi/ioc';


@ProviderIn(TransportServer, Deserializer)
export class IncomingRequestDeserializer implements Deserializer<TransportRequest | TransportEvent> {
    deserialize(
        value: any,
        options?: Record<string, any>,
    ): TransportRequest | TransportEvent {
        return this.isExternal(value) ? this.mapToSchema(value, options) : value;
    }

    isExternal(value: any): boolean {
        if (!value) {
            return true;
        }
        if (
            !isUndefined((value as TransportRequest).pattern) ||
            !isUndefined((value as TransportRequest).data)
        ) {
            return false;
        }
        return true;
    }

    mapToSchema(
        value: any,
        options?: Record<string, any>,
    ): TransportRequest | TransportEvent {
        if (!options) {
            return {
                pattern: undefined,
                data: undefined,
            };
        }
        return {
            pattern: options.channel,
            data: value,
        };
    }
}
