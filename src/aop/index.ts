import { IContainer } from '../IContainer';
import { IActionBuilder, ActionType } from '../actions';

export * from './Aspect';
export * from './After';
export * from './AfterReturning';
export * from './Before';
export * from './Joinpoint';
export * from  './Pointcut';

import { Aspect } from './Aspect';
export function registerAspect(container: IContainer, builder: IActionBuilder) {

    container.registerDecorator(Aspect,
        builder.build(Aspect.toString(),
            container.getDecoratorType(Aspect),
            ActionType.aspect));
}
