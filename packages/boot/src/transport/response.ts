import { TransportClient, Deserializer, TransportResponse } from '@tsdi/core';
import { isUndefined, ProviderIn } from '@tsdi/ioc';


@ProviderIn(TransportClient, Deserializer)
export class IncomingResponseDeserializer implements Deserializer<TransportResponse> {
    deserialize(value: any, options?: Record<string, any>): TransportResponse {
        return this.isExternal(value) ? this.mapToSchema(value) : value;
    }

    isExternal(value: any): boolean {
        if (!value) {
            return true;
        }
        if (
            !isUndefined((value as TransportResponse).err) ||
            !isUndefined((value as TransportResponse).response) ||
            !isUndefined((value as TransportResponse).disposed)
        ) {
            return false;
        }
        return true;
    }

    mapToSchema(value: any): TransportResponse {
        return {
            id: value && value.id,
            response: value,
            disposed: true,
        };
    }
}
