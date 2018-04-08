
import { IContainer, LifeScope, symbols, CoreActions } from '@tsioc/core';
import { Logger } from './decorators/Logger';
import { AnnotationLogerAspect } from './AnnotationLogerAspect';
import { ConsoleLogManager } from './ConsoleLog';

export * from './ILogger';
export * from './ILoggerManger';
export * from './ConsoleLog';
export * from './LogConfigure';
export * from './DefaultLogConfigure';
export * from './LoggerAspect';
export * from './AnnotationLogerAspect';
export * from './decorators/Logger';


export function registerLogs(container: IContainer) {
    let lifeScope = container.get<LifeScope>(symbols.LifeScope);
    lifeScope.registerDecorator(Logger, CoreActions.bindParameterProviders);

    container.register(AnnotationLogerAspect);
    container.register(ConsoleLogManager);
}
