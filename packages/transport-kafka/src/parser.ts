import { isNil } from "@tsdi/ioc";

export class KafkaRequestSerializer implements Serializer<any, KafkaRequest> {
    serialize(value: any): KafkaRequest {
        const isNotKafkaMessage =
            isNil(value) ||
            !isObject(value) ||
            (!('key' in value) && !('value' in value));

        if (isNotKafkaMessage) {
            value = { value };
        }
        value.value = this.encode(value.value);
        if (!isNil(value.key)) {
            value.key = this.encode(value.key);
        }
        if (isNil(value.headers)) {
            value.headers = {};
        }
        return value;
    }

    public encode(value: any): Buffer | string | null {
        const isObjectOrArray =
            !isNil(value) && !isString(value) && !Buffer.isBuffer(value);

        if (isObjectOrArray) {
            return isPlainObject(value) || Array.isArray(value)
                ? JSON.stringify(value)
                : value.toString();
        } else if (isUndefined(value)) {
            return null;
        }
        return value;
    }
}


export class KafkaResponseDeserializer implements Deserializer<any, ResponsePacket> {
    deserialize(message: any, options?: Record<string, any>): ResponsePacket {
        const id = message.headers[KafkaHeaders.CORRELATION_ID].toString();
        if (!isUndefined(message.headers[KafkaHeaders.NEST_ERR])) {
            return {
                id,
                err: message.headers[KafkaHeaders.NEST_ERR],
                disposed: true,
            };
        }
        if (!isUndefined(message.headers[KafkaHeaders.NEST_IS_DISPOSED])) {
            return {
                id,
                response: message.value,
                disposed: true,
            };
        }
        return {
            id,
            response: message.value,
            disposed: false,
        };
    }
}


export class KafkaParser {

    constructor(readonly keepBinary: boolean = false) {
    }

    public parse<T = any>(data: any): T {
        if (!this.keepBinary) {
            data.value = this.decode(data.value);
        }

        if (!isNil(data.key)) {
            data.key = this.decode(data.key);
        }
        if (!isNil(data.headers)) {
            const decodeHeaderByKey = (key: string) => {
                data.headers[key] = this.decode(data.headers[key]);
            };
            Object.keys(data.headers).forEach(decodeHeaderByKey);
        } else {
            data.headers = {};
        }
        return data;
    }

    public decode(value: Buffer): object | string | null | Buffer {
        if (isNil(value)) {
            return null;
        }
        // A value with the "leading zero byte" indicates the schema payload.
        // The "content" is possibly binary and should not be touched & parsed.
        if (
            Buffer.isBuffer(value) &&
            value.length > 0 &&
            value.readUInt8(0) === 0
        ) {
            return value;
        }

        let result = value.toString();
        const startChar = result.charAt(0);

        // only try to parse objects and arrays
        if (startChar === '{' || startChar === '[') {
            try {
                result = JSON.parse(value.toString());
            } catch (e) { }
        }
        return result;
    }
}
