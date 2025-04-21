import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class ReactiveEffect {
    abstract track(target: any, key: string | symbol): void;
    abstract trigger(target: any, key: string | symbol): void;
}