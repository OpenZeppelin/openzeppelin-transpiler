// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract ElementaryTypesWithConstructor  {

    struct ElementaryStructType {
        uint256 counter1;
        address randomAddress;
    }

    /**
     * @dev Indicates who the owner is., public generates getters in solidity AST
    */
    address public owner  ;
    bool public active;
    string public hello;
    int public count;
    uint public ucount;
    bytes32 public samevar;
    ElementaryStructType public esTypeTest;
    mapping(address => mapping(uint => address)) mappingTest;

    constructor() public {
        /**
         * @dev just a random setting of the address
        */

        owner = address(0x123);
        active = true;
        hello = "hello";
        count = -123;
        ucount = 123;
        samevar = "stringliteral";

        esTypeTest.counter1 = 450;
        esTypeTest.randomAddress = address(0xDEADC0DE);

    }
}
