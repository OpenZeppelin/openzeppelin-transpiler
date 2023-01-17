// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract StringConstructor {

    modifier hasModifier() {
        _;
    }

    constructor(string memory message) public hasModifier {

    }
}
