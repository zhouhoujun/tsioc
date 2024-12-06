import { Backend } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { DeserializeContext } from './Deserializer';
import { DeserializeMappings, SerializeMappings } from './mappings';
import { Observable, of } from 'rxjs';
import { isBuffer } from '../StreamAdapter';
import { SerializeContext } from './Serializer';


/**
 * Serialize Backend
 */
@Injectable()
export class SerializeBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, SerializeContext> {

    constructor(protected mappings: SerializeMappings) { }

    handle(input: TInput, context: SerializeContext): Observable<TOutput> {
        return this.mappings.serialize(input, context, {
            canHandle: () => context.transport.streamAdapter.isJson(input),
            handle: () => of(JSON.stringify(input))
        })
    }
}



/**
 * Deserialize Backend
 */
@Injectable()
export class DeserializeBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, DeserializeContext> {

    constructor(protected mappings: DeserializeMappings) { }

    handle(input: TInput, context: DeserializeContext): Observable<TOutput> {
        return this.mappings.deserialize(input, context, {
            canHandle: () => isBuffer(input) || isString(input),
            handle: () => of(JSON.parse((input as Buffer).toString()))
        })
    }
}



export class SerializeFactory {

}

export class DeserializeFactory {

}