import { Injector } from '@tsdi/ioc';
import { Pipe } from '../metadata';
import { invalidPipeArgument, PipeTransform } from './pipe';

/**
 * serializer
 */
export abstract class Serializer<TOut> {
    abstract serialize(value: any): TOut;
}

export abstract class JsonSerializer extends Serializer<Record<string, any>> {
    abstract serialize(value: any): Record<string, any>;
}

/**
 * serialize pipe.
 */
@Pipe('serialize')
export class SerializePipe implements PipeTransform {
    
    constructor(private injector: Injector) {}
    
    /**
     * @param value A value of any type to convert into a serialize data.
     */
    transform<TOut= any>(value: any, serializer?: Serializer<TOut>): TOut {
        try {
            return serializer ? serializer.serialize(value) : JSON.stringify(value, null, 2) as TOut
        } catch (err) {
            throw invalidPipeArgument(this, value, (err as Error).toString())
        }
    }

}
