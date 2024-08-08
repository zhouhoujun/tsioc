import { Token, Abstract, tokenId, Inject } from '@tsdi/ioc';
import { SuiteDescribe, ICaseDescribe } from './interface';
import { HrtimeFormatter } from '@tsdi/core';


/**
 * unit report multi token.
 */
export const UNIT_REPORTES = tokenId<Reporter[]>('UNIT_REPORTES');

/**
 * reportor.
 *
 */
export interface Reporter {
    /**
     * reporter render.
     * @param suites 
     */
    render(suites: Map<Token, SuiteDescribe>): Promise<void>;
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
@Abstract()
export abstract class AbstractReporter {

    @Inject()
    protected hrtime!: HrtimeFormatter;
    /**
     * reporter render.
     * @param suites 
     */
    abstract render(suites: Map<Token, SuiteDescribe>): Promise<void>;
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
export abstract class RealtimeReporter extends AbstractReporter {
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
