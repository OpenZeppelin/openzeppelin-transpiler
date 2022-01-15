// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Imported1 {
<<<<<<< HEAD

=======
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
    constructor(uint256 x, uint256 y) { }
}

contract Imported2 is Imported1 {
<<<<<<< HEAD

    struct imported2Struct {
        uint money;
        address payable payAddress;
    }

=======
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
    constructor(uint256 x, uint256 y) Imported1(x, y) { }
}
