import { Token, lang, Type, Abstract, isFunction } from '@tsdi/ioc';
import { ISuiteDescribe, ICaseDescribe } from './ITestReport';


/**
 * reportor.
 *
 * @export
 * @abstract
 * @class Reporter
 */
@Abstract()
export abstract class Reporter {

    /**
     * reporter render.
     * @param suites 
     */
    abstract render(suites: Map<Token, ISuiteDescribe>): Promise<void>;
    /**
     * reporter track.
     * @param error 
     */
    abstract track(error: Error): void;
}

/**
 * realtime reporter.
 */
@Abstract()
export abstract class RealtimeReporter extends Reporter {
    /**
     * render suite.
     *
     * @abstract
     * @param {ISuiteDescribe} desc
     */
    abstract renderSuite(desc: ISuiteDescribe): void;
    /**
     * render case.
     *
     * @abstract
     * @param {ICaseDescribe} desc
     */
    abstract renderCase(desc: ICaseDescribe): void;
}

/**
 * is target reporter.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isReporterClass(target: any): target is Type<Reporter> {
    return isFunction(target) && lang.isBaseOf(target, Reporter);
}
