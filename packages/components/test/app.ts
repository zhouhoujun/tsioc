import { Component, OnInit } from "../src";

@Component({
    selector: 'app-root',
    template: `
        <div>
            <h1>{{title}}</h1>
            <button @click="handleClick">Click me</button>
            <p :class="{active: isActive}">Status: {{status}}</p>
        </div>
    `,
    compilerOptions: {
        delimiters: ['[[', ']]'] // 自定义分隔符
    }
})
export class AppComponent implements OnInit {
    title = 'Hello World';
    isActive = true;
    status = 'Ready';

    onInit() {
        // 初始化逻辑
    }

    handleClick() {
        this.status = 'Clicked!';
    }
}
