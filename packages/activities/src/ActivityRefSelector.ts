import { Type, Singleton } from '@tsdi/ioc';
import { RefSelector, NodeSelector, ComponentManager } from '@tsdi/components';
import { SequenceActivity } from './activities';
import { Activity } from './core/Activity';


/**
 * activity ref selector.
 *
 * @export
 * @class ActivityRefSelector
 * @extends {RefSelector}
 */
@Singleton()
export class ActivityRefSelector extends RefSelector {

    getComponentSelector(): string {
        return 'activity';
    }

    getSelectKey(): string {
        return 'refId';
    }

    createNodeSelector(element: any): NodeSelector<any> {
        if (element instanceof Activity) {
            return element.getContainer().getInstance(ComponentManager).getSelector(element);
        }
        return null;
    }


    getDefaultCompose(): Type<any> {
        return SequenceActivity;
    }

    isComponentType(dectoator: string, element: any): boolean {
        return super.isComponentType(dectoator, element) || this.reflects.isExtends(element, Activity);
    }
}
