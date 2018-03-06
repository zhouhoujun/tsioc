import { TypeMetadata, IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator } from '../../core';
import { isClassMetadata, isString, isFunction } from '../../utils/index';
import { Express } from '../../types';


export interface LoggerMetadata extends TypeMetadata {
    logname?: string;
    express?: Express<any, boolean>;
    message?: string;
}
export interface ILoggerMetadata<T extends LoggerMetadata> extends IClassMethodDecorator<T> {
    (logname?: string, express?: Express<any, boolean>, message?: string): ClassMethodDecorator;
}

export const Logger: ILoggerMetadata<LoggerMetadata> = createClassMethodDecorator<TypeMetadata>('Logger',
    adapter => {
        adapter.next<LoggerMetadata>({
            isMetadata: (arg) => isClassMetadata(arg, ['logname']),
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.logname = arg;
            }
        });
        adapter.next<LoggerMetadata>({
            match: (arg) => isFunction(arg),
            setMetadata: (metadata, arg) => {
                metadata.express = arg;
            }
        });
        adapter.next<LoggerMetadata>({
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.message = arg;
            }
        });
    }) as ILoggerMetadata<LoggerMetadata>;
