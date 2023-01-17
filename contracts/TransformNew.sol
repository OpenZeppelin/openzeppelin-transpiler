pragma solidity ^0.6;

contract Foo {
    constructor(uint x) public {}
}

contract Bar {
}

contract TransformNew {
    function test1() external {
        Foo foo;
        foo = new Foo(1);
    }

    function test2() external {
        Bar bar;
        bar = new Bar();
    }

    function test3() external {
        address bar;
        bar = address(new Bar());
    }
}
