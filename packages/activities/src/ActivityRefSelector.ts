import { RefSelector, NodeSelector, ComponentManager } from '@tsdi/components';
import { Type, lang, Singleton } from '@tsdi/ioc';
import { SequenceActivity } from './activities';
import { Activity } from './core';

@Singleton()
export class ActivityRefSelector extends RefSelector {

    getComponentSelector(): string {
        return 'activity';
    }

    getSelectorId(): string {
        return 'refId';
    }

    createNodeSelector(element: any): NodeSelector<any> {
        if (element instanceof Activity) {
            return element.getContainer().get(ComponentManager).getSelector(element);
        }
        return null;
    }


    getDefaultCompose(): Type<any> {
        return SequenceActivity
    }
    isComponentType(dectoator: string, element: any): boolean {
        return super.isComponentType(dectoator, element) || lang.isExtendsClass(element, Activity);
    }
}
