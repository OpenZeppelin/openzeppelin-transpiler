pragma solidity ^0.6.0;

contract ElementaryTypesWithConstructorAndMigration {
    address public owner;
    bool active;
    string hello;
    int count;
    uint ucount;
    bytes32 samevar;

    constructor() public {
        owner = address(0x123);
        active = true;
        hello = "hello";
        count = -123;
        ucount = 123;
        samevar = "stringliteral";
    }

    function __ElementaryTypesWithConstructorAndMigration_migrate(int256 currentCount, uint256 currentUCount) internal {
        owner = address(0x123);
        active = true;
        hello = "hello";
        count = currentCount;
        ucount = currentUCount;
        samevar = "stringliteral";
    }
}
