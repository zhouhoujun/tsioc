import { Injectable } from '@tsdi/ioc';

/** UDP timeout strategy (placeholder). */
@Injectable()
export class UdpTimeoutStrategy {
    private _timeout = 0;

    getTimeout(): number {
        return this._timeout;
    }

    setTimeout(ms: number): void {
        this._timeout = ms;
    }
}
