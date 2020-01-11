import { Injectable, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IBuildOption, IComponentContext } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { DataBinding } from '../bindings/DataBinding';
import { CompContext } from './CompContext';

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

    static parse(injector: ICoreInjector, options: IBindingParseOption): ParseContext {
        return createRaiseContext(injector, ParseContext, options);
    }
}
