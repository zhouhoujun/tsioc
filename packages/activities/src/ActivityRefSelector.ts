import { Type, Singleton, SymbolType } from '@tsdi/ioc';
import { RefSelector, TemplateRef } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { ActivityComponentRef, ActivityElementRef } from './core/ActivityRef';
import { AnnoationContext } from '@tsdi/boot';
import { IActivity } from './core/IActivity';

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

    createComponentRef(type: Type, target: IActivity, context: AnnoationContext, tempRef: TemplateRef<IActivity>): ActivityComponentRef {
        return new ActivityComponentRef(type, target, context, tempRef);
    }

    createTemplateRef<T extends IActivity>(context: AnnoationContext, ...nodes: T[]): TemplateRef<T> {
        return new TemplateRef(context, nodes);
    }

    createElementRef(target: Activity, context: AnnoationContext): ActivityElementRef {
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
