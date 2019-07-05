import { Component, Input } from '../decorators';

@Component()
export class Element {
    @Input() id: string;
    @Input() name: string;

    $scope: any;

    $scopes: any[];
}
