import { SuiteDescribe, RealtimeReporter, ICaseDescribe } from '@tsdi/unit';
export declare class ConsoleReporter extends RealtimeReporter {
    track(error: Error): void;
    renderSuite(desc: SuiteDescribe): void;
    renderCase(desc: ICaseDescribe): void;
    render(suites: SuiteDescribe[], total: [number, number]): Promise<void>;
}
