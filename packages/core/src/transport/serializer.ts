import { Abstract } from '@tsdi/ioc';

/**
 * serializer.
 */
@Abstract()
export abstract class Serializer<TInput = any, TOutput = any> {
    /**
     * serialize value
     * @param value input value.
     */
    abstract serialize(value: TInput): TOutput;
}

/**
 * empty serializer.
 */
export class EmptySerializer implements Serializer {
    serialize(value: any) {
        return value;
    }
}
