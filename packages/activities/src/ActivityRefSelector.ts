import { Type, Singleton, SymbolType } from '@tsdi/ioc';
import { RefSelector } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { ActivityComponentRef, ActivityElementRef, ActivityTemplateRef } from './core/ActivityRef';
import { ActivityContext } from './core/ActivityContext';
import { IActivityRef } from './core/IActivityRef';

const attrSelPrefix = /^ACT_ATTR_/;
const seletPrefix = /^ACT_SELT_/;
/**
 * activity ref selector.
 *
 * @export
 * @class ActivityRefSelector
 * @extends {RefSelector}
 */
@Singleton()
export class ActivityRefSelector extends RefSelector {

    getSelectorKey(): string {
        return 'activity';
    }

    getRefSelectKey(): string {
        return 'refId';
    }

    getDefaultCompose(): Type<any> {
        return SequenceActivity;
    }

    createComponentRef(type: Type, target: Activity, context: ActivityContext, ...nodes: IActivityRef[]): ActivityComponentRef {
        return new ActivityComponentRef(type, target, context, this.createTemplateRef(context, ...nodes));
    }

    createTemplateRef(context: ActivityContext, ...nodes: IActivityRef[]): ActivityTemplateRef {
        return new ActivityTemplateRef(context, nodes);
    }

    createElementRef(target: Activity, context: ActivityContext): ActivityElementRef {
        return new ActivityElementRef(context, target);
    }

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
