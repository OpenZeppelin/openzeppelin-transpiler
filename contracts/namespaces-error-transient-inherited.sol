// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract TransientInheritedBase {
    uint256 internal transient t;
}

contract TransientInheritedError is TransientInheritedBase {
    function f() external {
        t = 1;
    }
}
