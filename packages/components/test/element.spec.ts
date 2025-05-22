import expect = require('expect');
import jest = require('jest');
import { Effect } from './your-effect-module'; // 请替换为实际的effect模块路径

describe('processElement', () => {
  let instance: any;
  let mockEffect: jest.Mocked<Effect>;
  let mockElement: HTMLElement;
  let mockContext: any;

  beforeEach(() => {
    // @ts-ignore
    mockEffect = {
      run: jest.fn((fn) => fn())
    };

    instance = {
      effect: mockEffect,
      walkNodes: jest.fn(),
      handleSpecialAttribute: jest.fn()
    };

    mockElement = document.createElement('div');
    
    mockContext = {
      clickHandler: jest.fn(),
      className: 'test-class',
      styleValue: 'color: red;',
      attrValue: 'test-value'
    };
  });

  test('should process event binding', () => {
    mockElement.setAttribute('@click', 'clickHandler');
    
    instance.processElement(mockElement, mockContext);
    
    expect(mockEffect.run).toHaveBeenCalled();
    expect(mockElement.addEventListener).toHaveBeenCalledWith('click', mockContext.clickHandler);
  });

  test('should process normal attribute binding', () => {
    mockElement.setAttribute(':data-test', 'attrValue');
    
    instance.processElement(mockElement, mockContext);
    
    expect(mockEffect.run).toHaveBeenCalled();
    expect(mockElement.setAttribute).toHaveBeenCalledWith('data-test', 'test-value');
  });

  test('should process class attribute binding', () => {
    mockElement.setAttribute(':class', 'className');
    
    instance.processElement(mockElement, mockContext);
    
    expect(mockEffect.run).toHaveBeenCalled();
    expect(instance.handleSpecialAttribute).toHaveBeenCalledWith(
      mockElement, 'class', 'test-class'
    );
  });

  test('should process style attribute binding', () => {
    mockElement.setAttribute(':style', 'styleValue');
    
    instance.processElement(mockElement, mockContext);
    
    expect(mockEffect.run).toHaveBeenCalled();
    expect(instance.handleSpecialAttribute).toHaveBeenCalledWith(
      mockElement, 'style', 'color: red;'
    );
  });

  test('should recursively process child nodes', () => {
    const childNode = document.createElement('span');
    mockElement.appendChild(childNode);
    
    instance.processElement(mockElement, mockContext);
    
    expect(instance.walkNodes).toHaveBeenCalledWith(mockElement.childNodes, mockContext);
  });

  test('should not process child nodes when none exist', () => {
    instance.processElement(mockElement, mockContext);
    
    expect(instance.walkNodes).not.toHaveBeenCalled();
  });
});
