import { Abstract, Inject, isNumber } from '@tsdi/ioc';
import { BytesFormatPipe, TimeFormatPipe } from '@tsdi/core';
import { Logger } from '@tsdi/logger';
import { RequestContext } from '../RequestContext';


/**
 * status formater.
 */
@Abstract()
export abstract class ResponseStatusFormater {

    @Inject()
    protected bytes!: BytesFormatPipe;
    @Inject()
    protected times!: TimeFormatPipe;

    abstract get incoming(): string;
    abstract get outgoing(): string;

    constructor() {

    }

    abstract hrtime(time?: [number, number]): [number, number];

    abstract format(logger: Logger, ctx: RequestContext, hrtime?: [number, number]): string[];

    protected formatSize(size?: number, precise = 2) {
        if (!isNumber(size)) return ''
        return this.bytes.transform(size, precise)
    }

    protected formatHrtime(hrtime: [number, number], precise = 2): string {
        if (!hrtime) return '';
        const [s, ns] = hrtime;
        const total = s * 1e3 + ns / 1e6;

        return this.times.transform(total, precise)
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;
