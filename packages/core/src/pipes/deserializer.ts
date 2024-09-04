import { Injector, isNil, isString } from '@tsdi/ioc';
import { Pipe } from '../metadata';
import { invalidPipeArgument, PipeTransform } from './pipe';

/**
 * deserializer.
 */
export abstract class Deserializer<TOut> {
    abstract deserialize(value: any): TOut;
}

/**
 * Json deserializer.
 */
export abstract class JsonDeserializer<T> extends Deserializer<T> {
    abstract deserialize(value: Record<string, any>): T;
}

/**
 * deserialize pipe.
 */
@Pipe('deserialize')
export class DeserializePipe implements PipeTransform {
    
    constructor(private injector: Injector) {}
    /**
     * @param value A value of serialized data to convert into a type Object.
     */
    transform(value: any, deserializer?: Deserializer<any>): any {
        if (isNil(value)) throw invalidPipeArgument(this, value);
        if (isString(value)) {
            try {
                return deserializer ? deserializer.deserialize(value) : JSON.parse(value)
            } catch (err) {
                throw invalidPipeArgument(this, value, (err as Error).toString())
            }
        }
        return value
    }

}
