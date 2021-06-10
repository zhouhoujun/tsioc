import { Abstract } from '@tsdi/ioc';
import { StartupService } from '../services/startup';

/**
 * startup db connections of application.
 */
@Abstract()
export abstract class ConnectionStatupService extends StartupService {

}
