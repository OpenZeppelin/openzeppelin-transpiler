// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @custom:oz-transpile-namespace OverriddenName
contract NamespaceOverride1 {
    address private x;
}

/// @custom:oz-transpile-namespace OverriddenName2
contract NamespaceOverride2 {
    address private x;
    constructor() {
        x = msg.sender;
    }
}

/// @custom:oz-transpile-namespace OverriddenName3
contract NamespaceOverride3 {
    address private x = msg.sender;
}

/// @custom:oz-transpile-namespace OverriddenName4
contract NamespaceOverride4 {
    uint x; // a comment

    uint y;

    function f() public {
        x = 3;
    }

    function g() public {
    }
}
