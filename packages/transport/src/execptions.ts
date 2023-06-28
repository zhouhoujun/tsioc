import { Execption } from '@tsdi/ioc';


export class InvalidStreamExecption extends Execption {
    constructor(message = 'Invalid stream error') {
        super(message)
    }
}

export class HeandersSentExecption extends Execption {
    constructor(message = 'Headers has sent') {
        super(`HeandersSentExecption: ${message}`)
    }
}

export class InvalidSessionExecption extends Execption {
    constructor(message = 'Invalid session error') {
        super(`InvalidSessionExecption: ${message}`)
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

export class PushDisabledExecption extends Execption {
    constructor(message = 'Push disabled') {
        super(`PushDisabledExecption: ${message}`)
    }
}

export class NestedPushExecption extends Execption {
    constructor(message = 'Nest push') {
        super(`NestedPushExecption: ${message}`)
    }
}



export class PacketLengthException extends Execption {

}

