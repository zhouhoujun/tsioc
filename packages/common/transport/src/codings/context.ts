import { OnDestroy } from '@tsdi/ioc';
import { AbstractTransportSession } from '../TransportSession';



export class CodingsContext implements OnDestroy {

    private _inputs: any[];
    get inputs(): any[] {
        return this._inputs;
    }

    constructor(readonly session: AbstractTransportSession) {
        this._inputs = [];
    }

    get options() {
        return this.session.options
    }

    next<TInput>(input: TInput): this {
        if (this._inputs[0] != input) {
            this._inputs.unshift(input);
        }
        return this;
    }

    first<TInput>(): TInput {
        return this._inputs[this._inputs.length - 1]
    }

    last<TInput>(): TInput {
        return this._inputs[0];
    }

    onDestroy(): void {
        this._inputs = [];
    }

}
