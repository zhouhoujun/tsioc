import { Injectable, createRaiseContext, lang } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBuildOption, IComponentContext, BuildContext } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { DataBinding } from '../bindings/DataBinding';
import { CompContext } from './CompContext';
import { IComponentReflect } from '../IComponentReflect';

/**
 * binding parse option.
 *
 * @export
 * @interface IBindingParseOption
 * @extends {IBuildOption}
 */
export interface IBindingParseOption extends IBuildOption {
    bindExpression?: any;
    binding: IBinding;
}

/**
 * parse context.
 *
 * @export
 * @class ParseContext
 * @extends {BuildContext}
 * @implements {IComponentContext}
 */
@Injectable
export class ParseContext extends CompContext<IBindingParseOption> implements IComponentContext {

    get binding(): IBinding {
        return this.getOptions().binding;
    }

    get bindExpression(): any {
        return this.getOptions().bindExpression;
    }

    dataBinding?: DataBinding;


    getExtenalTemplate() {
        let parent = this.getParent() as CompContext;
        if (parent) {
            if (parent.template && parent.targetReflect) {
                return lang.omit(parent.template,
                    ...Array.from(parent.targetReflect.propInBindings?.keys() ?? []),
                    ...Array.from(parent.targetReflect.propOutBindings?.keys() ?? []),
                    ...Array.from(parent.targetReflect.propRefChildBindings?.keys() ?? []))
            }
        }
        return {};
    }

    static parse(injector: ICoreInjector, options: IBindingParseOption): ParseContext {
        return createRaiseContext(injector, ParseContext, options);
    }
}
