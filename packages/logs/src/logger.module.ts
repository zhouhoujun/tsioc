import { Module, ProviderType } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { AnnotationLogAspect } from './aspect';
import { LoggerManager } from './LoggerManager';
import { ConsoleLogManager, ConfigureLoggerManager } from './manager';
import { DefaultLogFormater } from './formater';

/**
 * logger providers.
 */
export const LOGGER_PROVIDERS: ProviderType[] = [
    ConfigureLoggerManager,
    AnnotationLogAspect,
    DefaultLogFormater,
    ConsoleLogManager,
    { provide: LoggerManager, useExisting: ConfigureLoggerManager }
];

/**
 * aop logs ext for Ioc. auto run setup after registered.
 * @export
 * @class LogModule
 */
@Module({
    imports: [
        AopModule
    ],
    providers: [
        ...LOGGER_PROVIDERS
    ]
})
export class LoggerModule {

}


