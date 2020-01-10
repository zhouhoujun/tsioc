import { Injectable, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BuildContext, IBuildOption, IComponentContext, AnnoationContext } from '@tsdi/boot';
import { IBinding } from '../bindings/IBinding';
import { DataBinding } from '../bindings/DataBinding';
import { CTX_COMPONENT } from '../ComponentRef';

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
export class ParseContext extends BuildContext<IBindingParseOption> implements IComponentContext {

    get binding(): IBinding {
        return this.getOptions().binding;
    }

    get bindExpression(): any {
        return this.getOptions().bindExpression;
    }

    private _scope: any;
    get scope(): any {
        if (!this._scope) {
            let ctx: AnnoationContext = this;
            while (ctx && !this._scope) {
                this._scope = ctx.get(CTX_COMPONENT);
                ctx = ctx.getParent();
            }
        }
        return this._scope;
    }

    dataBinding?: DataBinding;

    static parse(injector: ICoreInjector, options: IBindingParseOption): ParseContext {
        return createRaiseContext(injector, ParseContext, options);
    }
}
