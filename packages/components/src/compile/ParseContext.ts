import { Injectable, lang, tokenId, isDefined, TokenId, IInjector } from '@tsdi/ioc';
import { createContext } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { PropBinding } from '../bindings/PropBinding';
import { ComponentContext, IComponentContext, IComponentOption } from '../ComponentContext';
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
export interface IBindingParseOption extends IComponentOption {
    bindExpression?: any;
    binding?: IBinding;
}

/**
 * parse context interface.
 */
export interface IParseContext extends IComponentContext<IBindingParseOption> {
    readonly binding: IBinding;
    readonly bindExpression: any;
    readonly dataBinding: PropBinding;
    getExtenalBindings(): any;
}

export const CTX_BIND_DATABINDING: TokenId<PropBinding> = tokenId<PropBinding>('CTX_BIND_DATABINDING');
export const CTX_BIND_BINDING = tokenId<IBinding>('CTX_BIND_BINDING');
export const CTX_BIND_EXPRESSION = tokenId<any>('CTX_BIND_EXPRESSION');
export const CTX_BIND_PARSED = tokenId<boolean>('CTX_BIND_PARSED');



const inputDect = Input.toString();
const outputDect = Output.toString();
const refDect = RefChild.toString();

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
        return this.getValue(CTX_BIND_BINDING);
    }

    get bindExpression(): any {
        return this.getValue(CTX_BIND_EXPRESSION);
    }

    get dataBinding(): PropBinding {
        return this.getValue(CTX_BIND_DATABINDING)
    }

    getExtenalBindings() {
        let parent = this.getParent() as ComponentContext;
        if (parent) {
            let template = parent.getTemplate();
            let targetReflect = parent.getTargetReflect();
            if (template && targetReflect) {
                return lang.omit(template,
                    ...Array.from(targetReflect.getBindings(inputDect)?.keys() ?? []),
                    ...Array.from(targetReflect.getBindings(outputDect)?.keys() ?? []),
                    ...Array.from(targetReflect.getBindings(refDect)?.keys() ?? []))
            }
        }
        return {};
    }

    setOptions(options: IBindingParseOption) {
        if (!options) {
            return this;
        }
        if (options.binding) {
            this.setValue(CTX_BIND_BINDING, options.binding);
        }
        if (isDefined(options.bindExpression)) {
            this.setValue(CTX_BIND_EXPRESSION, options.bindExpression);
        }
        return super.setOptions(options);
    }

    static parse(injector: IInjector, options: IBindingParseOption): ParseContext {
        return createContext(injector, ParseContext, options);
    }
}
