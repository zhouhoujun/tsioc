
export * from './actions';
export * from './decorators';
export * from './metadatas';
export * from './AspectSet';
export * from './IAdviceMatcher';
export * from './AdviceMatcher';
export * from './MatchPointcut';
export * from './Joinpoint';
// export * from './MatchPointcutInvoker';


import { IContainer } from '../IContainer';
import { Aspect } from './decorators';
import { AspectSet } from './AspectSet';
import { symbols } from '../utils';
import { IAopActionBuilder, AopActions, AopActionBuilder } from './actions';
import { AdviceMatcher } from './AdviceMatcher';
import { Advice } from '../index';

/**
 * register aop for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerAops(container: IContainer) {

    container.register(AdviceMatcher);
    container.register(AopActionBuilder);
    container.register(AdviceMatcher);
    container.register(AspectSet);
    let builder = container.get<IAopActionBuilder>(symbols.IAopActionBuilder);

    container.registerDecorator(Aspect,
        builder.build(
            Aspect.toString(),
            container.getDecoratorType(Aspect),
            AopActions.registAspect));

    container.register(Advice, builder.build(
        Advice.toString(),
        container.getDecoratorType(Advice),
        AopActions.beforeConstructor, AopActions.afterConstructor,
        AopActions.bindMethodPointcut, AopActions.bindPropertyPointcut))

}
