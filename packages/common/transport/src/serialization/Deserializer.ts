import { Backend, Context } from '@tsdi/core';
import { Injectable, OnDestroy, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { MappingsAapter } from './adapter';
import { Transport } from '../Transport';

export abstract class Deserializer {
    abstract deserialize<T>(input: string | Buffer): Observable<T>;
}


/**
 * Deserialize context.
 */
export class DeserializeContext extends Context implements OnDestroy {


    private _completed = false;



    constructor(readonly transport: Transport, private adapter?: MappingsAapter | null) {
        super()
    }

    getDefault(type: Type | string): Type | string | undefined {
        return this.adapter?.getDefault(type)
    }


    isCompleted(data: any) {
        if (this._completed) return true;
        if (this.adapter) {
            return this.adapter.isCompleted(data);
        }
        return false;
    }

    complete() {
        this._completed = true
    }

    override onDestroy(): void {
        super.onDestroy();
        this.adapter = null;
    }

}


// /**
//  * Decoding Backend
//  */
// @Injectable()
// export class DeserializeBackend<TInput = any, TOutput = any> implements Backend<TInput, TOutput, > {

//     constructor(protected mappings: CodingMappings) { }

//     handle(input: TInput, context: CodingsContext): Observable<TOutput> {
//         return this.mappings.decode(input, context)
//             .pipe(
//                 mergeMap(data => {
//                     if (context.isCompleted(data)) return of(data);
//                     return this.mappings.decode(data, context)
//                 })
//             );
//     }
// }