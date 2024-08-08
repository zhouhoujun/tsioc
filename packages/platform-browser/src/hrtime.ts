import { HrtimeFormatter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import hrtime = require('browser-process-hrtime');

@Injectable()
export class BrowserHrtimeFormatter extends HrtimeFormatter {
    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

}