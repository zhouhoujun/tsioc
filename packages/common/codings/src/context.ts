import { OnDestroy } from '@tsdi/ioc';
import { InvocationArgs } from '@tsdi/core';
import { CodingsOpts } from './options';

/**
 * transprot codings context.
 */
export class CodingsContext<TOpts extends CodingsOpts = CodingsOpts> extends InvocationArgs implements OnDestroy {

    
    constructor(readonly options: TOpts) {
        super()
    }


    encodeComplete(data: any): boolean {
        if(!this.options.encodeComplete) return true;
        return this.options.encodeComplete(data)
    }

    decodeComplete(data: any): boolean {
        if(!this.options.decodeComplete) return true;
        return this.options.decodeComplete(data)
    }



}
