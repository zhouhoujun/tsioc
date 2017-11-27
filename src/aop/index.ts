import { IContainer } from '../IContainer';
import { IActionBuilder, ActionType } from '../actions';

export * from './Aspect';
export * from './Runner';
export * from './RunnerMetadata';
export * from './RunnerAction';

import { Aspect } from './Aspect';
import { Runner } from './Runner';
export function registerAspect(container: IContainer, builder: IActionBuilder) {

    container.registerDecorator(Runner,
        builder.build(Runner.toString(),
            container.getDecoratorType(Runner),
            ActionType.runner));
    container.registerDecorator(Aspect,
        builder.build(Aspect.toString(),
            container.getDecoratorType(Aspect),
            ActionType.aspect));
}
