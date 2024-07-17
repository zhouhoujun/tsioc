import { OnDestroy, Type } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { CodingsOptions } from './options';
import { CodingsAapter } from './CodingsAapter';



/**
 * codings context.
 */
export class CodingsContext<TOpts extends CodingsOptions = CodingsOptions> extends Context implements OnDestroy {


    private _completed = false;

    get options(): TOpts {
        return this._opts;
    }


    constructor(private _opts: TOpts, private adapter?: CodingsAapter | null) {
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
        // if (this.options?.complete) {
        //     return this.options.complete(data)
        // } else if (this.options?.end) {
        //     return data instanceof this.options.end
        // }
        return false;
    }

    complete() {
        this._completed = true
    }

    override onDestroy(): void {
        super.onDestroy();
        this._opts = null!;
        this.adapter = null;
    }

}
