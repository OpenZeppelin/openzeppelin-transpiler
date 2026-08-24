// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract TransientValueError {
    uint256 private transient t;

    function f() external returns (uint256) {
        uint256 y = (t = 1);
        return y;
    }
}
