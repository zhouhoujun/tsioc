import { Runtime } from '@tsdi/ioc';
import { AdviceMatcher } from '../AdviceMatcher';
import { AdviceMetadata } from '../metadata/meta';
import { MatchExpress } from '../Advicer';
/**
 * advice matcher, use to match advice when a registered create instance.
 * implements {@link IAdviceMatcher}.
 * @export
 * @class AdviceMatcher
 * @implements {IAdviceMatcher}
 */
export declare class DefaultAdviceMatcher implements AdviceMatcher {
    private runtime;
    constructor(runtime: Runtime);
    parse(aspectMeta: AdviceMetadata): MatchExpress;
    protected matchAspectSelf(name: string | symbol, metadata: AdviceMetadata): boolean;
    protected matchTypeFactory(metadata: AdviceMetadata): MatchExpress;
    protected spiltBrace(strExp: string): string;
    protected expressToFunc(strExp: string, metadata: AdviceMetadata): MatchExpress;
    protected toAnnExpress(exp: string): MatchExpress;
    protected toExecExpress(exp: string): MatchExpress;
    protected toPropExpress(exp: string): MatchExpress;
    protected tranlateExpress(strExp: string, metadata: AdviceMetadata): MatchExpress;
}
export declare class BoolExpression {
    private _parsed;
    constructor(express: string, isToken?: (exp: string) => boolean);
    private _tokens;
    get tokens(): string[];
    toString(map?: (token: string, idx?: number, tokenIdx?: number, exp?: ExpToken[]) => string): string;
}
type ExpToken = {
    type: string;
    value: string;
};
export declare const isAdviceToken: (exp: string) => boolean;
export {};
