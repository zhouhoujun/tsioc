import { ContainerFactory, Injectable, Type, createRaiseContext } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BuildContext, IModuleResolveOption, IComponentContext } from '@tsdi/boot';
import { IBinding, DataBinding } from '../bindings';

/**
 * binding parse option.
 *
 * @export
 * @interface IBindingParseOption
 * @extends {IModuleResolveOption}
 */
export interface IBindingParseOption extends IModuleResolveOption  {
    scope?: any;
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
export class ParseContext extends BuildContext<IBindingParseOption> implements IComponentContext {

    get binding(): IBinding {
        return this.getOptions().binding;
    }

    get bindExpression(): any {
        return this.getOptions().bindExpression;
    }

    dataBinding?: DataBinding;

    value?: any;

    static parse(options: IBindingParseOption, raiseContainer?: ContainerFactory<IContainer>): ParseContext {
        return createRaiseContext(ParseContext, options, raiseContainer);
    }
}
