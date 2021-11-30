import { Module } from '../metadata/decor';
import { TransactionalAspect } from './aspect';

@Module({
    providers:[
        TransactionalAspect
    ]
})
export class TransitionModule {

} 