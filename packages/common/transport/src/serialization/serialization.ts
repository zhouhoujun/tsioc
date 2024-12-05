import { Backend } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { DeserializeContext } from './Deserializer';
import { DeserializeMappings } from './mappings';
import { catchError, mergeMap, Observable, of } from 'rxjs';
import { DeserializeNotHandleExecption } from './execptions';



/**
 * Decoding Backend
 */
@Injectable()
export class DeserializeBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, DeserializeContext> {

    constructor(protected mappings: DeserializeMappings) { }

    handle(input: TInput, context: DeserializeContext): Observable<TOutput> {
        return this.mappings.deserialize(input, context)
            .pipe(
                catchError((err) => {
                    if(err instanceof DeserializeNotHandleExecption) {
                    return 
                    }
                })
            );
    }
}

export class SerializeFactory {

}

export class DeserializeFactory {

}