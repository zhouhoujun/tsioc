import { AbstractClient, Deserializer, TrasportResponse } from '@tsdi/core';
import { isUndefined, ProviderIn } from '@tsdi/ioc';


@ProviderIn(AbstractClient, Deserializer)
export class IncomingResponseDeserializer implements Deserializer<TrasportResponse> {
    deserialize(value: any, options?: Record<string, any>): TrasportResponse {
        return this.isExternal(value) ? this.mapToSchema(value) : value;
    }

    isExternal(value: any): boolean {
        if (!value) {
            return true;
        }
        if (
            !isUndefined((value as TrasportResponse).err) ||
            !isUndefined((value as TrasportResponse).response) ||
            !isUndefined((value as TrasportResponse).disposed)
        ) {
            return false;
        }
        return true;
    }

    mapToSchema(value: any): TrasportResponse {
        return {
            id: value && value.id,
            response: value,
            disposed: true,
        };
    }
}
