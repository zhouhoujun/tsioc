import { Exception, AbstractType } from '@tsdi/ioc';
/**
 * Invalid Json execption.
 */
export declare class InvalidJsonException extends Exception {
    constructor(err: any, source: string);
}
/**
 * Invaild Stream execption.
 */
export declare class InvalidStreamException extends Exception {
    constructor(message?: string);
}
/**
 * Not handled execption.
 */
export declare class NotHandleException extends Exception {
    readonly target: any;
    readonly targetType: AbstractType | string;
    constructor(target: any, targetType: AbstractType | string, message?: string);
}
export declare class ConfigMissingException extends Exception {
    constructor(message?: string);
}
export declare class GoawayException extends Exception {
    constructor(message?: string);
}
export declare class OfflineException extends Exception {
    constructor(message?: string);
}
export declare class DisconnectException extends Exception {
    constructor(message?: string);
}
