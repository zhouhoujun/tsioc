import { ContainerFactory, Injectable, createRaiseContext, IInjector } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BuildContext, IModuleResolveOption, IComponentContext } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { DataBinding } from '../bindings/DataBinding';

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

    static parse(injector: IInjector, options: IBindingParseOption): ParseContext {
        return createRaiseContext(ParseContext, options, injector);
    }
}
