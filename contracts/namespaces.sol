// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract C1 {
}

contract C2 {
    event B();

    struct A { uint z; }

    uint constant C = 3;
    // a
    uint x;
    // b
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint immutable y = 2;
    uint private z;

    string private s1 = "";

    function f() public {
        z = 3;
    }

    function g() public {
    }
}

contract C3 {
    address private x;
}

contract C4 {
    address private x;
    constructor() {
        x = msg.sender;
    }
}

contract C5 {
    address private x = msg.sender;
}

contract C6 {
}

contract C7 {
    uint x; // a comment

    uint y;
    // a separate comment
}
