import { ArgumentError, Execption, isArray } from '@tsdi/ioc';


/**
 * Transport error
 *
 * @export
 * @class TransportError
 * @extends {Error}
 */
export class TransportError extends Execption {

    constructor(readonly status: number, message?: string | string[]) {
        super(isArray(message) ? message.join('\n') : message || '')
    }

    get statusCode(): number {
        return this.status
    }

    toString() {
        return `Transport Error: ${this.status}, ${this.message}`
    }
}

/**
 * transport arguments error.
 */
export class TransportArgumentError extends ArgumentError {
    constructor(message?: string | string[]) {
        super(message)
    }
}

