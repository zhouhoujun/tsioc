import { Injectable } from '@tsdi/ioc';
import { IBuildContext, BuildOption, Template } from '../Context';
import { AnnoationContext } from '../annotations/ctx';

@Injectable()
export class BuildContext<T extends BuildOption = BuildOption> extends AnnoationContext<T> implements IBuildContext<T> {

    /**
     * current target module
     *
     * @type {*}
     * @memberof BuildContext
     */
    value: any;

    /**
     * current type attr data to binding.
     */
    get template(): Template {
        return this.options.template;
    }

    protected setOptions(options: T) {
        if (!options) {
            return this;
        }
        return super.setOptions(options);
    }
}
