pragma solidity ^0.6;

contract Foo {
    constructor(uint x) public {}
}

contract Bar {
}

contract TransformNew {
    Foo foo = new Foo(1);
    Bar bar = new Bar();
    address baz = address(new Bar());
}
