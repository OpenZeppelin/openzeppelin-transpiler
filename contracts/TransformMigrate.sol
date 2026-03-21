pragma solidity ^0.8;

contract Foo {
    uint256 public counter;

    constructor(uint256 initialValue) {
        counter = initialValue;
    }

    /// @custom:add-modifier onlyInitializing
    function __Foo_migrate(uint256 initialValue) internal {
        if (counter == 0) {
            counter = initialValue;
        }
    }
}

contract Bar {
    address public owner;
    uint256 public counter;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier whenPaused() {
        require(paused, "Not paused");
        _;
    }

    /// @custom:add-modifier onlyOwner
    /// @custom:add-modifier whenPaused
    function setCounter(uint256 initialValue) internal {
        if (counter == 0) {
            counter = initialValue;
        }
    }
}