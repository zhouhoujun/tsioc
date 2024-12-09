import { Backend, Context } from '@tsdi/core';
import { Injectable, OnDestroy, Type } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { StatusAdapter } from './adapter';
import { Transport } from '../Transport';

export abstract class Deserializer {
    abstract deserialize<T>(input: string | Buffer, context: DeserializeContext): Observable<T>;
}


/**
 * Deserialize context.
 */
export class DeserializeContext extends Context implements OnDestroy {


    private _completed = false;



    constructor(readonly transport: Transport, readonly req: any, private adapter?: StatusAdapter | null) {
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
