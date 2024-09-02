import { Pipe } from '../metadata';
import { invalidPipeArgument, PipeTransform } from './pipe';

/**
 * serializer
 */
export abstract class Serializer<T> {
    abstract serialize(value: T): any;
}

export abstract class JsonSerializer extends Serializer<any> {
    abstract serialize(value: any): any;
}

/**
 * serialize pipe.
 */
@Pipe('serialize')
export class SerializePipe<TOut = any> implements PipeTransform {
    /**
     * @param value A value of any type to convert into a serialize data.
     */
    transform(value: any, serializer?: Serializer<any>): TOut {
        try {
            return serializer ? serializer.serialize(value) : JSON.stringify(value, null, 2)
        } catch (err) {
            throw invalidPipeArgument(this, value, (err as Error).toString())
        }
    }

}
