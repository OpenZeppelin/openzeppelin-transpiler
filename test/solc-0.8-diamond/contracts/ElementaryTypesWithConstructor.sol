// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract ElementaryTypesWithConstructor  {
<<<<<<< HEAD

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

    constructor() {
        /**
         * @dev just a random setting of the address
        */
=======
    address public owner;
    bool active;
    string hello;
    int count;
    uint ucount;
    bytes32 samevar;

    constructor() {
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
        owner = address(0x123);
        active = true;
        hello = "hello";
        count = -123;
        ucount = 123;
        samevar = "stringliteral";
<<<<<<< HEAD
        esTypeTest.counter1 = 450;
        esTypeTest.randomAddress = address(0xDEADC0DE);
=======
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
    }
}
