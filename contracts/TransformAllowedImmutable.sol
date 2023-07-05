// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract T1 {
    uint immutable a = 1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint immutable b = 4;
    uint immutable c = 3;
}

contract T2 {
    uint immutable a = 1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint immutable b = 4;
    uint immutable c;
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(uint _c) {
      c = _c;
    }
}

abstract contract T3 is T2 {
}
