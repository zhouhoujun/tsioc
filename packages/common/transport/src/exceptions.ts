import { Exception } from '@tsdi/ioc';

export class InvalidStreamException extends Exception {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}


export class PushDisabledException extends Exception {
    constructor(message = 'Push disabled') {
        super(`PushDisabledException: ${message}`)
    }
}


export class NestedPushException extends Exception {
    constructor(message = 'Nest push') {
        super(`NestedPushException: ${message}`)
    }
}


export class PacketLengthException extends Exception {

}

