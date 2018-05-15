import { IocModule, Inject, symbols, IContainer, LifeScope, LifeState, CoreActions } from '@ts-ioc/core';
import { AopModule } from '@ts-ioc/aop';
import { Logger } from './decorators/Logger';
import { AnnotationLogerAspect } from './AnnotationLogerAspect';
import { ConsoleLogManager } from './ConsoleLogManager';
import { LogSymbols } from './symbols';
import { ConfigureLoggerManger } from './ConfigureLoggerManger';
import { LogFormater } from './LogFormater';

/**
 * aop logs bootstrap main. auto run setup after registered.
 * with @IocModule('setup') decorator.
 * @export
 * @class LogModule
 */
@IocModule('setup')
export class LogModule {

    constructor(@Inject(symbols.IContainer) private container: IContainer) {

    }

    static symbols = LogSymbols;

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        if (!container.has(AopModule)) {
            container.register(AopModule);
        }
        let lifeScope = container.get<LifeScope>(symbols.LifeScope);
        lifeScope.registerDecorator(Logger, LifeState.onInit, CoreActions.bindParameterProviders);
        container.register(ConfigureLoggerManger);
        container.register(AnnotationLogerAspect);
        container.register(LogFormater);
        container.register(ConsoleLogManager);
    }
}
