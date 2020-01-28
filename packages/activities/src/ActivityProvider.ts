import { Type, Singleton, SymbolType } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnoationContext } from '@tsdi/boot';
import { ComponentProvider, ITemplateOption, ITemplateContext } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import {
    ActivityComponentRef, ActivityElementRef, ActivityTemplateRef, IActivityComponentRef,
    IActivityTemplateRef, IActivityElementRef, ActivityNodeType
} from './core/ActivityRef';
import { ActivityContext, ActivityTemplateContext } from './core/ActivityContext';


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

    getSelectorKey(): string {
        return 'activity';
    }

    getRefSelectKey(): string {
        return 'refId';
    }

    getDefaultCompose(): Type<any> {
        return SequenceActivity;
    }

    parseElementRef = true;

    // createComponentRef<T>(type: Type<T>, target: T, context: ActivityContext, ...nodes: ActivityNodeType[]): IActivityComponentRef<T> {
    //     return new ActivityComponentRef(type, target, context, this.createTemplateRef(context, ...nodes));
    // }


    isTemplateContext(context: AnnoationContext): boolean {
        return context instanceof ActivityContext;
    }

    createTemplateContext(injector: ICoreInjector, options?: ITemplateOption): ITemplateContext {
        return ActivityTemplateContext.parse(injector, options);
    }

    // createTemplateRef(context: ActivityContext, ...nodes: ActivityNodeType[]): IActivityTemplateRef<ActivityNodeType> {
    //     return new ActivityTemplateRef(context, nodes);
    // }

    // createElementRef(context: ActivityContext, target: Activity): IActivityElementRef {
    //     return new ActivityElementRef(context, target);
    // }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `ACT_SELT_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ACT_ATTR_${selector}`;
    }

    isElementType(element: any): boolean {
        return this.reflects.isExtends(element, Activity);
    }
}
