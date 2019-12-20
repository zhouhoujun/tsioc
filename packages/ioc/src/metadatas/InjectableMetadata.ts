import { ClassMetadata } from './ClassMetadata';


export interface RegInMetadata {
    /**
     * reg the class type in root or not.
     */
    regIn?: 'root';
}

/**
 * Injectable. default a
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends ClassMetadata, RegInMetadata {

}
