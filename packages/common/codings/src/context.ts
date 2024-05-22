import { OnDestroy } from '@tsdi/ioc';
import { InvocationArgs } from '@tsdi/core';
import { CodingsOpts } from './options';

/**
 * transprot codings context.
 */
export class CodingsContext<TOpts extends CodingsOpts = CodingsOpts> extends InvocationArgs implements OnDestroy {

    private _complete = false;
    get complete(): boolean {
        return this._complete;
    }

    constructor(readonly options: TOpts) {
        super()
    }

    protected override onNext(data: any): void {
        if (this.options.comolete) {
            this._complete = this.options.comolete(data)
        }
        super.onNext(data);
    }


}
