// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract ElementaryTypesWithConstructor  {
    /**
     * @dev Indicates who the owner is.
    */
    address public owner;
    bool active;
    string hello;
    int count;
    uint ucount;
    bytes32 samevar;

    constructor() {
        owner = address(0x123);
        active = true;
        hello = "hello";
        count = -123;
        ucount = 123;
        samevar = "stringliteral";
    }
}
