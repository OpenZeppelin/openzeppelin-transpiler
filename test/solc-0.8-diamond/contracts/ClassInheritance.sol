// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract CIA {
    uint256 public foo;
<<<<<<< HEAD
    uint256 public foo2;
=======
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
    event log(string);
    constructor(uint bar) {
        foo = bar;
        emit log("SIA");
    }
}

contract CIB is CIA(324) {
    uint256 public val = 123;
<<<<<<< HEAD

    constructor() {
        foo2 = 456;
    }

=======
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
}
