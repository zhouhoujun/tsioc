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
