import { OnDestroy, Type } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { CodingsOption } from './options';


/**
 * codings context.
 */
export class CodingsContext<TOpts extends CodingsOption = CodingsOption> extends Context implements OnDestroy {


    private _completed = false;

    get options(): TOpts {
        return this._opts;
    }


    constructor(private _opts: TOpts, private defaults: Map<Type | string, Type | string>) {
        super()
    }

    getDefault(type: Type | string): Type | string | undefined {
        return this.defaults.get(type)
    }


    isCompleted(data: any) {
        if (this._completed) return true;
        if (this.options?.complete) {
            return this.options.complete(data)
        } else if (this.options?.end) {
            return data instanceof this.options.end
        }
        return false;
    }

    complete() {
        this._completed = true
    }

    override onDestroy(): void {
        super.onDestroy();
        this._opts = null!;
        this.defaults = null!;
    }

}
