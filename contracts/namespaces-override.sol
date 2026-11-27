// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/// @custom:namespace-override openzeppelin.storage.OverriddenName
contract NamespaceOverride1 {
    address private x;
}

/// @custom:namespace-override openzeppelin.storage.OverriddenName2
contract NamespaceOverride2 {
    address private x;
    constructor() {
        x = msg.sender;
    }
}

/// @custom:namespace-override example.main
contract NamespaceOverride3 {
    address private x = msg.sender;
}

/// @custom:namespace-override my.custom.namespace
contract NamespaceOverride4 {
    uint x; // a comment

    uint y;

    function f() public {
        x = 3;
    }

    function g() public {
    }
}
