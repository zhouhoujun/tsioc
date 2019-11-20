import { ContainerFactory, Injectable, Type } from '@tsdi/ioc';
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
export class ParseContext extends BuildContext implements IComponentContext {

    binding: IBinding;

    bindExpression?: any;

    dataBinding?: DataBinding;

    scope?: any;

    value?: any;


    static parse(type: Type, options: IBindingParseOption, raiseContainer?: IContainer | ContainerFactory<IContainer>): ParseContext {
        let ctx = new ParseContext(type);
        ctx.setOptions(options);
        raiseContainer && ctx.setRaiseContainer(raiseContainer);
        return ctx;
    }
}
