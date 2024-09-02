import { isNil, isString } from '@tsdi/ioc';
import { Pipe } from '../metadata';
import { invalidPipeArgument, PipeTransform } from './pipe';

/**
 * deserializer.
 */
export abstract class Deserializer<T> {
    abstract deserialize(value: any): T;
}

/**
 * Json deserializer.
 */
export abstract class JsonDeserializer extends Deserializer<any> {
    abstract deserialize(value: any): any;

}

/**
 * deserialize pipe.
 */
@Pipe('deserialize')
export class DeserializePipe implements PipeTransform {
    /**
     * @param value A value of serialized data to convert into a type Object.
     */
    transform(value: any, deserializer?: Deserializer<any>): string {
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
