
export * from './actions';
export * from './decorators';
export * from './metadatas';
export * from './AspectSet';

import { IContainer } from '../IContainer';
import { Aspect } from './decorators';
import { AspectSet } from './AspectSet';
import { symbols } from '../utils';
import { IAopActionBuilder, AopActions, AopActionBuilder } from './actions';

export function registerAops(container: IContainer) {
    container.registerSingleton(symbols.IAopActionBuilder, AopActionBuilder);
    let builder = container.get<IAopActionBuilder>(symbols.IAopActionBuilder);
    container.register(AspectSet);
    container.registerDecorator(Aspect,
        builder.build(Aspect.toString(),
            container.getDecoratorType(Aspect),
            AopActions.registAspect));
}
