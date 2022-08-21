import { Execption } from '@tsdi/ioc';


const invalidStreamMsg = 'Invalid stream error';
export class InvalidStreamExecption extends Execption {
    constructor(message = invalidStreamMsg) {
        super(message)
    }
}

const heandersSentMsg = 'Headers has sent'
export class HeandersSentExecption extends Execption {
    constructor(message = heandersSentMsg) {
        super(message)
    }
}