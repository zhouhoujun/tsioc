import { TimeFormatPipe } from './pipes/formats/time';
export declare abstract class HrtimeFormatter {
    protected times: TimeFormatPipe;
    abstract hrtime(time?: [number, number]): [number, number];
    format(hrtime?: [number, number], precise?: number): string;
}
