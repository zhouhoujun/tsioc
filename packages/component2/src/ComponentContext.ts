import { tokenId } from '@tsdi/ioc';
import { BuildContext, IBuildOption, CTX_ELEMENT_NAME, IBuildContext } from '@tsdi/boot';
import {
    CTX_COMPONENT_DECTOR, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_REF,
    CTX_ELEMENT_REF, IComponentRef, ITemplateRef, CTX_TEMPLATE_SCOPE
} from './ComponentRef';
import { IComponentMetadata } from './decorators/IComponentMetadata';
import { IComponentReflect } from './IComponentReflect';

export interface IComponentOption extends IBuildOption {

    /**
     * build as attr or not.
     */
    attr?: boolean;

    /**
     * sub build or not.
     */
    sub?: boolean;
}


export interface IComponentContext<T extends IComponentOption = IComponentOption> extends IBuildContext<T> {
    readonly name: string;
    getResultRef(): IComponentRef | ITemplateRef;

    getTargetReflect(): IComponentReflect;

    /**
     * annoation metadata.
     */
    getAnnoation(): IComponentMetadata;

    /**
     * component instance.
     */
    getComponent<T = any>(): T;

    getComponentContext(): IComponentContext;
    /**
     * template scope.
     */
    getScope<T>(): T;
    getScopes(): any[];
    readonly componentDecorator: string;

}

export const CTX_COMPONENT_CONTEXT = tokenId<IComponentContext>('CTX_COMPONENT_CONTEXT');

export class ComponentContext<T extends IComponentOption = IComponentOption>
    extends BuildContext<T> implements IComponentContext<T> {

    get name() {
        return this.context.getValue(CTX_ELEMENT_NAME);
    }

    getResultRef() {
        return this.context.getFirstValue(CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF) ?? this.value;
    }

    getTargetReflect(): IComponentReflect {
        return super.getTargetReflect();
    }

    /**
     * annoation metadata.
     */
    getAnnoation(): IComponentMetadata {
        return super.getAnnoation();
    }

    /**
     * component instance.
     *
     * @readonly
     * @type {*}
     * @memberof ComponentContext
     */
    getComponent<T = any>(): T {
        return this.context.getValue(CTX_COMPONENT)
            ?? this.getParent()?.getContextValue(CTX_COMPONENT, com => this.setValue(CTX_COMPONENT, com));
    }

    getComponentContext(): IComponentContext {
        return (this.context.getValue(CTX_COMPONENT_CONTEXT)
            ?? this.getParent()?.getContextValue(CTX_COMPONENT_CONTEXT, ctx => this.setValue(CTX_COMPONENT_CONTEXT, ctx)));
    }


    /**
     * template scope.
     *
     * @readonly
     * @memberof ComponentContext
     */
    getScope<T>(): T {
        return this.context.getValue(CTX_TEMPLATE_SCOPE)
            ?? this.getParent()?.getContextValue(CTX_TEMPLATE_SCOPE, scope => this.setValue(CTX_TEMPLATE_SCOPE, scope));
    }

    getScopes() {
        let scopes = [];
        let ctx = this.getComponentContext();
        while (ctx && !ctx.destroyed) {
            let comp = ctx.getValue(CTX_COMPONENT);
            if (comp) {
                scopes.push(comp);
            }
            ctx = ctx.getComponentContext();
        }
        return scopes;
    }

    get componentDecorator() {
        return this.context.getValue(CTX_COMPONENT_DECTOR)
            ?? this.getParent()?.getContextValue(CTX_COMPONENT_DECTOR, dector => this.setValue(CTX_COMPONENT_DECTOR, dector));
    }

}

