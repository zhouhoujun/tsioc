import { Singleton, Type } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { ComponentFactory, IComponentRef } from '@tsdi/components';
import { ActivityRef } from './ActivityRef';
import { IActivity } from './IActivity';


@Singleton()
export class ActivityFactory extends ComponentFactory {
    create<T>(componentType: Type<T>, target: T, context: AnnoationContext, ...nodes: IActivity[]): IComponentRef<T, IActivity> {
        return new ActivityRef(componentType, target, context, nodes);
    }
}
