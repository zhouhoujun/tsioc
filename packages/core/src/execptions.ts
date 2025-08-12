import { Exception, AbstractType } from '@tsdi/ioc';



/**
 * Invalid Json execption.
 */
export class InvalidJsonException extends Exception {
    constructor(err: any, source: string) {
        super(`is invalid JSON: ${err.message}\nSource data: ${source}`);
    }
}

/**
 * Invaild Stream execption.
 */
export class InvalidStreamException extends Exception {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}

/**
 * Not handled execption.
 */
export class NotHandleException extends Exception {
    constructor(readonly target: any, readonly targetType: AbstractType | string, message = 'Not handle') {
        super(message)
    }
}

export class ConfigMissingException extends Exception {
    constructor(message = 'Config Missing') {
        super(`ConfigMissingException: ${message}`)
    }
}


export class GoawayException extends Exception {
    constructor(message = 'Connection gowary') {
        super(`GoawayException: ${message}`)
    }
}

export class OfflineException extends Exception {
    constructor(message = 'Connection offline') {
        super(`OfflineException: ${message}`)
    }
}

export class DisconnectException extends Exception {
    constructor(message = 'Connection disconnect') {
        super(`DisconnectException: ${message}`)
    }
}

