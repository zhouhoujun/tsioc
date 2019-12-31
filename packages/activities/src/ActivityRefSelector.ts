import { Type, Singleton } from '@tsdi/ioc';
import { RefSelector } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';
import { ActivityContext } from './core/ActivityContext';
import { ActivityRef } from './core/ActivityRef';

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

    createComponentRef(type: Type, target: any, context: ActivityContext, nodes: any | any[]): ActivityRef {
        return new ActivityRef(type, target, context, this.createRootNodeRef(nodes, context));
    }

    isComponentType(element: any): boolean {
        return super.isComponentType(element) || this.reflects.isExtends(element, Activity);
    }
}
