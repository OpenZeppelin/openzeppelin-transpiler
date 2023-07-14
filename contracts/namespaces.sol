// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract U {
    event B();

    struct A { uint z; }

    // a
    uint x;
    // b
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint immutable y = 2;
    uint z;

    function f() public {
        z = 3;
    }

    function g() public {
    }
}
