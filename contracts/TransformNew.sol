pragma solidity ^0.6;

contract Foo {
    constructor(uint x) public {}
}

contract TransformNew {
    function test() external {
        Foo foo;
        foo = new Foo(1);
    }
}
