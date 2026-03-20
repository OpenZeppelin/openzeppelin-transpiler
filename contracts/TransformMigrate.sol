pragma solidity ^0.6;

contract Foo {
    uint256 public counter;

    constructor(uint256 initialValue) public {
        counter = initialValue;
    }

    function __Foo_migrate(uint256 initialValue) internal {
        if (counter == 0) {
            counter = initialValue;
        }
    }
}

abstract contract Bar {
    uint256 public x;

    constructor(uint _x) public { x = _x; }

    function __Bar_migrate(uint _x) internal virtual;
}