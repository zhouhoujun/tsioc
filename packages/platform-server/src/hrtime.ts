import { HrtimeFormatter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { hrtime } from 'process';

@Injectable()
export class ServerHrtimeFormatter extends HrtimeFormatter {
    hrtime(time?: [number, number] | undefined): [number, number] {
        return hrtime(time);
    }

}