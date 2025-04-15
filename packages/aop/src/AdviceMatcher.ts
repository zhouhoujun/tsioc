import { Abstract } from '@tsdi/ioc';
import { AdviceMetadata } from './metadata/meta';
import { MatchExpress } from './Advicer';


/**
 * advice match interface, use to match advice when a registered create instance.
 */
@Abstract()
export abstract class AdviceMatcher {
    abstract parse(adviceMatadata: AdviceMetadata): MatchExpress;
}

