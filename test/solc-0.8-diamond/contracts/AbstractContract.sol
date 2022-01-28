// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

abstract contract AbstractContract {

}

abstract contract EIP712 {
    constructor(string memory name, string memory version) {
    }
}


abstract contract AbstractContractWithConstructor is AbstractContract, EIP712 {
    string private _name;

    constructor(string memory name_) EIP712(name_, version()) {
        _name = name_;
    }

    function version() pure public returns (string memory) {
        return "1";
    }
}

abstract contract AbstractContractWithParentConstructor is AbstractContractWithConstructor {
    uint randomNumber = 255;
}
