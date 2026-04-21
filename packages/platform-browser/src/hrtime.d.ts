import { HrtimeFormatter } from '@tsdi/core';
export declare class BrowserHrtimeFormatter extends HrtimeFormatter {
    hrtime(time?: [number, number] | undefined): [number, number];
}
