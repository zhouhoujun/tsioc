import { Type, Singleton } from '@tsdi/ioc';
import { RefSelector } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { ActivityFactory } from './core/ActivityFactory';

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

    isComponentType(element: any): boolean {
        return super.isComponentType(element) || this.reflects.isExtends(element, Activity);
    }
}
