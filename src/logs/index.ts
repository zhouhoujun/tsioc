import { IContainer } from '../IContainer';
import { LifeScope } from '../LifeScope';
import { symbols } from '../utils/index';
import { Logger } from './decorators/Logger';
import { CoreActions } from '../core/index';
import { AnnotationLogerAspect } from './AnnotationLogerAspect';
import { ConsoleLogManager } from './ConsoleLog';
// import { Log4jsAdapter } from './Log4jsAdapter';

export * from './ILogger';
export * from './ILoggerManger';
// export * from './Log4jsAdapter';
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
    // container.register(Log4jsAdapter);
    container.register(ConsoleLogManager);
}
