// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract CIA {
    uint256 public foo;
    event log(string);
    constructor(uint bar) {
        foo = bar;
        emit log("SIA");
    }
}

contract CIB is CIA(324) {
    uint256 public val = 123;
}
