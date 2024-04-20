import { OnDestroy } from '@tsdi/ioc';
import { AbstractTransportSession } from '../TransportSession';
import { CodingsOpts } from './mappings';



export class CodingsContext implements OnDestroy {

    private _inputs: any[];
    get inputs(): any[] {
        return this._inputs;
    }

    readonly options: CodingsOpts;
    readonly session?: AbstractTransportSession;
    
    constructor(options: CodingsOpts);
    constructor(session: AbstractTransportSession);
    constructor(args: CodingsOpts | AbstractTransportSession) {
        if(args instanceof AbstractTransportSession) {
            this.session = args;
            this.options = this.session.options;
        } else {
            this.options = args;
        }
        this._inputs = [];
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
