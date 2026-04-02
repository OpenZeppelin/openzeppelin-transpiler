// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @custom:override-namespace-id OverriddenName
contract NamespaceOverride1 {
    address private x;
}

/// @custom:override-namespace-id OverriddenName2
contract NamespaceOverride2 {
    address private x;
    constructor() {
        x = msg.sender;
    }
}

/// @custom:override-namespace-id OverriddenName3
contract NamespaceOverride3 {
    address private x = msg.sender;
}

/// @custom:override-namespace-id OverriddenName4
contract NamespaceOverride4 {
    uint x; // a comment

    uint y;

    function f() public {
        x = 3;
    }

    function g() public {
    }
}
