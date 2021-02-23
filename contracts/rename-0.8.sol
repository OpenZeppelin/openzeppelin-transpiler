// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

contract A {}

contract B is A {}

library L {
    struct S {
        uint x;
    }
}

contract U {
    using L for L.S;
}
