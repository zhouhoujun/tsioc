import { Type, Singleton, SymbolType } from '@tsdi/ioc';
import { RefSelector } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { ActivityFactory } from './core/ActivityFactory';

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

    getDefaultComponentFactory() {
        return ActivityFactory;
    }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `ACT_SELT_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ACT_ATTR_${selector}`;
    }

    isComponentType(element: any): boolean {
        return super.isComponentType(element) || this.reflects.isExtends(element, Activity);
    }
}
