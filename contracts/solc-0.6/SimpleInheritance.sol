// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract SIA {
    uint256 public foo;
    event log(string);
    constructor() {
        emit log("SIA");
    }
}

contract SIB is SIA {
    uint256 public val = 123;
}

contract SIC is SIB {
    string public bar = "hello";
    constructor() {
        bar = "changed";
        emit log("SIC");
    }
}
