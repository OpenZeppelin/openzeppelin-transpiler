// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8;

contract A {
    function foo() external virtual {}
}

contract B is A {
    /// @inheritdoc A
    function foo() external override {}
}

library L {
    struct S {
        uint x;
    }
}

contract U {
    using L for L.S;
}
