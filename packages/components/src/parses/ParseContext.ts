import { Injectable, createRaiseContext, lang, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBuildOption } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { DataBinding } from '../bindings/DataBinding';
import { ComponentContext, IComponentContext } from './ComponentContext';
import { Input } from '../decorators/Input';
import { Output } from '../decorators/Output';
import { RefChild } from '../decorators/RefChild';

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
 * parse context interface.
 */
export interface IParseContext extends IComponentContext<IBindingParseOption> {
    readonly binding: IBinding;
    readonly bindExpression: any;
    readonly dataBinding: DataBinding;
    getExtenalTemplate(): any;
}

export const CTX_DATABINDING = tokenId<DataBinding>('CTX_DATABINDING');

/**
 * parse context.
 *
 * @export
 * @class ParseContext
 * @extends {BuildContext}
 * @implements {IComponentContext}
 */
@Injectable
export class ParseContext extends ComponentContext<IBindingParseOption> implements IParseContext {

    get binding(): IBinding {
        return this.getOptions().binding;
    }

    get bindExpression(): any {
        return this.getOptions().bindExpression;
    }

    get dataBinding(): DataBinding {
        return this.getValue(CTX_DATABINDING)
    }


    getExtenalTemplate() {
        let parent = this.getParent() as ComponentContext;
        if (parent) {
            if (parent.template && parent.targetReflect) {
                return lang.omit(parent.template,
                    ...Array.from(parent.targetReflect.getBindings(Input.toString())?.keys() ?? []),
                    ...Array.from(parent.targetReflect.getBindings(Output.toString())?.keys() ?? []),
                    ...Array.from(parent.targetReflect.getBindings(RefChild.toString())?.keys() ?? []))
            }
        }
        return {};
    }

    static parse(injector: ICoreInjector, options: IBindingParseOption): ParseContext {
        return createRaiseContext(injector, ParseContext, options);
    }
}
