// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract T {
    uint immutable a = 1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint immutable b = 4;
    uint immutable c = 3;
}
