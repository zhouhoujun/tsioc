import { Type, Singleton, SymbolType, ClassType } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnoationContext } from '@tsdi/boot';
import { ComponentProvider, ITemplateOption, ITemplateContext, CONTEXT_REF, NATIVE_ELEMENT, IElementRef, IComponentRef } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { IActivityElementRef, ControlActivityElementRef, ActivityElementRef, ActivityComponentRef } from './core/WorkflowContext';
import { ActivityContext, ActivityTemplateContext } from './core/ActivityContext';
import { ControlActivity } from './core/ControlActivity';


const attrSelPrefix = /^ACT_ATTR_/;
const seletPrefix = /^ACT_SELT_/;
/**
 * activity provider.
 *
 * @export
 * @class ActivityProvider
 * @extends {ComponentProvider}
 */
@Singleton()
export class ActivityProvider extends ComponentProvider {
    isElementRef(target: any): target is IElementRef {
        return target instanceof ActivityElementRef;
    }
    isComponentRef(target: any): target is IComponentRef {
        return target instanceof ActivityComponentRef;
    }

    isElementRefType(target: ClassType): boolean {
        return target === ActivityElementRef;
    }

    isComponentRefType(target: ClassType): boolean {
        return target === ActivityComponentRef;
    }

    getSelectorKey(): string {
        return 'activity';
    }

    getRefSelectKey(): string {
        return 'refId';
    }

    getDefaultCompose(): Type<any> {
        return SequenceActivity;
    }

    parseRef = true;

    isTemplateContext(context: AnnoationContext): boolean {
        return context instanceof ActivityContext;
    }

    createTemplateContext(injector: ICoreInjector, options?: ITemplateOption): ITemplateContext {
        return ActivityTemplateContext.parse(injector, options);
    }

    createElementRef(context: ActivityContext, target: Activity): IActivityElementRef {
        if (target instanceof ControlActivity) {
            return this.getProviders().getInstance(ControlActivityElementRef,
                { provide: CONTEXT_REF, useValue: context },
                { provide: NATIVE_ELEMENT, useValue: target })
        }
        return super.createElementRef(context, target) as IActivityElementRef;
    }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `ACT_SELT_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ACT_ATTR_${selector}`;
    }

    isElementType(element: ClassType): boolean {
        return  element?.classType === 'activity';
    }
}
