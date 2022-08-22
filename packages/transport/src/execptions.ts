import { Execption } from '@tsdi/ioc';


const invalidStreamMsg = 'Invalid stream error';
export class InvalidStreamExecption extends Execption {
    constructor(message = invalidStreamMsg) {
        super(message)
    }
}

const heandersSentMsg = 'Headers has sent';
export class HeandersSentExecption extends Execption {
    constructor(message = heandersSentMsg) {
        super(`HeandersSentExecption: ${message}`)
    }
}


const invalidSessionMsg = 'Invalid session error';
export class InvalidSessionExecption extends Execption {
    constructor(message = invalidSessionMsg) {
        super(`InvalidSessionExecption: ${message}`)
    }
}


const goawayMsg = 'Connection gowary';
export class GoawayExecption extends Execption {
    constructor(message = goawayMsg) {
        super(`GoawayExecption: ${message}`)
    }
}


const pushDisMsg = 'Push disabled';
export class PushDisabledExecption extends Execption {
    constructor(message = pushDisMsg) {
        super(`PushDisabledExecption: ${message}`)
    }
}


const nestPushMsg = 'Nest push';
export class NestedPushExecption extends Execption {
    constructor(message = nestPushMsg) {
        super(`NestedPushExecption: ${message}`)
    }
}