pragma solidity ^0.8;

contract Foo {
    uint256 public counter;

    constructor(uint256 initialValue) {
        counter = initialValue;
    }

    /// @custom:oz-upgrades-optional-initializer
    function __Foo_migrate(uint256 initialValue) internal {
        if (counter == 0) {
            counter = initialValue;
        }
    }
}