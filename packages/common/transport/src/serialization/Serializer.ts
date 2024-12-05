import { Context } from '@tsdi/core';
import { OnDestroy, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { MappingsAapter } from './adapter';
import { Transport } from '../Transport';

export abstract class Serializer {
    abstract serialize<T>(input: T, context: SerializeContext): Observable<string | Buffer>;
}



/**
 * Serialize context.
 */
export class SerializeContext extends Context implements OnDestroy {


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
