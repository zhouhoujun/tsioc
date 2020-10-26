import { Abstract, Inject, IOC_CONTAINER, Injectable, IIocContainer} from '../src';

@Injectable()
export class Home {
    getAddress() {
        return 'home';
    }
}

@Abstract()
export abstract class Animal {

    @Inject()
    home: Home;

    @Inject(IOC_CONTAINER)
    container: IIocContainer;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable()
export class Person extends Animal {

}
