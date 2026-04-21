import { HrtimeFormatter } from '@tsdi/core';
export declare class ServerHrtimeFormatter extends HrtimeFormatter {
    hrtime(time?: [number, number] | undefined): [number, number];
}
