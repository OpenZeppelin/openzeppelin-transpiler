// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Imported1 {

    constructor(uint256 x, uint256 y) { }
}

contract Imported2 is Imported1 {

    struct imported2Struct {
        uint money;
        address payable payAddress;
    }

    constructor(uint256 x, uint256 y) Imported1(x, y) { }
}
