import { AdviceMetadata } from './metadata/meta';
import { MatchExpress } from './Advicer';
/**
 * advice match interface, use to match advice when a registered create instance.
 */
export declare abstract class AdviceMatcher {
    abstract parse(adviceMatadata: AdviceMetadata): MatchExpress;
}
