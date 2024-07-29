import { Execption, Type } from '@tsdi/ioc';



/**
 * Invalid Json execption.
 */
export class InvalidJsonException extends Execption {
    constructor(err: any, source: string) {
        super(`is invalid JSON: ${err.message}\nSource data: ${source}`);
    }
}

/**
 * Invaild Stream execption.
 */
export class InvalidStreamExecption extends Execption {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}

/**
 * Not handled execption.
 */
export class NotHandleExecption extends Execption {
    constructor(readonly target: any, readonly targetType: Type | string, message = 'Not handle') {
        super(message)
    }
}

export class ConfigMissingExecption extends Execption {
    constructor(message = 'Config Missing') {
        super(`ConfigMissingExecption: ${message}`)
    }
}


export class GoawayExecption extends Execption {
    constructor(message = 'Connection gowary') {
        super(`GoawayExecption: ${message}`)
    }
}

export class OfflineExecption extends Execption {
    constructor(message = 'Connection offline') {
        super(`OfflineExecption: ${message}`)
    }
}

export class DisconnectExecption extends Execption {
    constructor(message = 'Connection disconnect') {
        super(`DisconnectExecption: ${message}`)
    }
}

