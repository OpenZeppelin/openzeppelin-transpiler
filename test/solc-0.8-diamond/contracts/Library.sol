// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Library {

    struct libStruct {
        uint256 _justALibStructVariable;
        mapping (address => Library.libStruct) testLibStructSelfMapping;

    }


}
