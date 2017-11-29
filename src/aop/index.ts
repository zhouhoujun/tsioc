import { IContainer } from '../IContainer';
import { IActionBuilder, ActionType } from '../actions';

export * from './decorators';


import { Aspect } from './decorators';
import { AspectSet } from './AspectSet';
export function registerAspect(container: IContainer, builder: IActionBuilder) {

    container.register(AspectSet);
    container.registerDecorator(Aspect,
        builder.build(Aspect.toString(),
            container.getDecoratorType(Aspect),
            ActionType.aspect));
}
