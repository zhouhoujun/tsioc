import { BuildContext, BuildOption, Template } from '../Context';
import { AnnoationContextImpl } from '../annotations/ctx';


export class BuildContextImpl<T extends BuildOption = BuildOption> extends AnnoationContextImpl<T> implements BuildContext {
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
