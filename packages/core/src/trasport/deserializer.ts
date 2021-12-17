import { Abstract } from '@tsdi/ioc';

/**
 * descrializer.
 */
@Abstract()
export abstract class Deserializer<TOutput = any, TInput = any> {
    /**
     * deserialize value.
     * @param value input value.
     */
    abstract deserialize(value: TInput): TOutput | Promise<TOutput>;
}

export class EmptyDeserializer implements Deserializer {
    deserialize(value: any) {
        return value;
    }
}
