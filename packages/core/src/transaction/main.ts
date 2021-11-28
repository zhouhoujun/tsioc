import { Module } from '../metadata/decor';
import { TransactionalAspect } from './aspect';

@Module({
    providedIn: 'root',
    providers:[
        TransactionalAspect
    ]
})
export class TransitionModule {

} 