import { SuiteDescribe, ICaseDescribe } from './interface';
import { HrtimeFormatter } from '@tsdi/core';
import { CoverageOptions } from '../UnitTestConfigure';
/**
 * unit report multi token.
 */
export declare const UNIT_REPORTES: import("@tsdi/ioc").InjectToken<Reporter[]>;
/**
 * reportor.
 *
 */
export interface Reporter {
    /**
     * reporter render.
     * @param suites
     */
    render(suites: SuiteDescribe[], total: [number, number]): Promise<void>;
    /**
     * reporter track.
     * @param error
     */
    track(error: Error): void;
}
/**
 * abstract reportor. base reportor.
 *
 * @export
 * @abstract
 * @class Reporter
 */
export declare abstract class AbstractReporter {
    protected hrtime: HrtimeFormatter;
    /**
     * reporter render.
     * @param suites
     */
    abstract render(suites: SuiteDescribe[], total: [number, number]): Promise<void>;
    /**
     * reporter track.
     * @param error
     */
    abstract track(error: Error): void;
}
export declare abstract class CoverageReporter extends AbstractReporter {
    abstract setOptions(options: CoverageOptions): void;
}
/**
 * realtime reporter.
 */
export declare abstract class RealtimeReporter extends AbstractReporter {
    /**
     * render suite.
     *
     * @abstract
     * @param {SuiteDescribe} desc
     */
    abstract renderSuite(desc: SuiteDescribe): void;
    /**
     * render case.
     *
     * @abstract
     * @param {ICaseDescribe} desc
     */
    abstract renderCase(desc: ICaseDescribe): void;
}
