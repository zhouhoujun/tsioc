import { Abstract, Inject } from '@tsdi/ioc';
import { TimeFormatPipe } from './pipes/formats/time';


@Abstract()
export abstract class HrtimeFormatter {

    @Inject()
    protected times!: TimeFormatPipe;

    abstract hrtime(time?: [number, number]): [number, number];


    format(hrtime?: [number, number], precise = 2): string {
        if (!hrtime) return '';
        const [s, ns] = hrtime;
        const total = s * 1e3 + ns / 1e6;

        return this.times.transform(total, precise)
    }
}
