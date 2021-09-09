import { Abstract, Inject, CONTAINER, Injectable, Container} from '../src';

@Injectable()
export class Home {
    getAddress() {
        return 'home';
    }
}

@Abstract()
export abstract class Animal {

    @Inject()
    home!: Home;

    @Inject()
    container!: Container;

    back() {
        return 'back ' + this.home.getAddress();
    }
}

@Injectable()
export class Person extends Animal {

}
