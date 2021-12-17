import { AbstractServer, Deserializer, TrasportEvent, TrasportRequest } from '@tsdi/core';
import { isUndefined, ProviderIn } from '@tsdi/ioc';


@ProviderIn(AbstractServer, Deserializer)
export class IncomingRequestDeserializer implements Deserializer<TrasportRequest | TrasportEvent> {
    deserialize(
        value: any,
        options?: Record<string, any>,
    ): TrasportRequest | TrasportEvent {
        return this.isExternal(value) ? this.mapToSchema(value, options) : value;
    }

    isExternal(value: any): boolean {
        if (!value) {
            return true;
        }
        if (
            !isUndefined((value as TrasportRequest).pattern) ||
            !isUndefined((value as TrasportRequest).data)
        ) {
            return false;
        }
        return true;
    }

    mapToSchema(
        value: any,
        options?: Record<string, any>,
    ): TrasportRequest | TrasportEvent {
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
