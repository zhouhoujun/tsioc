import { OnDestroy, lang } from '@tsdi/ioc';
import { InvocationArgs } from '@tsdi/core';
import { CodingsOpts } from './options';

export enum CodingType {
    Encode,
    Decode
}

/**
 * transprot codings context.
 */
export class CodingsContext<TOpts extends CodingsOpts = CodingsOpts> extends InvocationArgs implements OnDestroy {


    private _encodeCompleted = false;
    private _decodeCompleted = false;
    constructor(readonly options: TOpts) {
        super()
    }


    get encodeCompleted(): boolean {
        return this._encodeCompleted;
    }

    get decodeCompleted(): boolean {
        return this._decodeCompleted;
    }


    next<TInput>(input: TInput, state: CodingType): this {
        super.next(input, state);
        return this;
    }

    protected onNext(data: any, state: CodingType) {
        super.onNext(data, state);
        if (state == CodingType.Encode) {
            if (this.options.encodeComplete) {
                this._encodeCompleted = this.options.encodeComplete(data)
            } else {
                const end = this.options.encodings?.end ?? lang.last(this.options.encodings?.chain);
                if (end && data instanceof end) {
                    this._encodeCompleted = true;
                }
            }
        } else {
            if (this.options.decodeComplete) {
                this._decodeCompleted = this.options.decodeComplete(data)
            } else {
                const end = this.options.decodings?.end ?? lang.last(this.options.decodings?.chain);
                if (end && data instanceof end) {
                    this._decodeCompleted = true;
                }
            }
        }
    }

    complete(type: CodingType) {
        if (type == CodingType.Encode) {
            this._encodeCompleted = true
        } else {
            this._decodeCompleted = true;
        }
    }

}
