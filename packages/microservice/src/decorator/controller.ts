import { Injectable } from '@tsdi/ioc';
import { Pattern, Transport } from '@tsdi/common';
import { getPatternMetadata } from './pattern';

export function MicroserviceController(): ClassDecorator {
    return (target: Function) => {
        Injectable()(target);
    };
}

export interface MicroserviceControllerOptions {
    prefix?: string;
    version?: string;
    transport?: Transport;
}

export function MicroserviceControllerWithOptions(options: MicroserviceControllerOptions): ClassDecorator {
    return (target: Function) => {
        Injectable()(target);
        Reflect.defineMetadata('microservice:controller_options', options, target);
    };
}

export function scanControllerHandlers(controller: object): Array<{
    methodName: string;
    method: Function;
    patterns: Pattern[];
}> {
    const handlers: Array<{
        methodName: string;
        method: Function;
        patterns: Pattern[];
    }> = [];
    
    const prototype = Object.getPrototypeOf(controller);
    const methodNames = Object.getOwnPropertyNames(prototype)
        .filter(name => name !== 'constructor' && typeof prototype[name] === 'function');
    
    for (const methodName of methodNames) {
        const method = prototype[methodName];
        const patterns = getPatternMetadata(method);
        
        if (patterns && patterns.length) {
            handlers.push({
                methodName,
                method,
                patterns
            });
        }
    }
    
    return handlers;
}