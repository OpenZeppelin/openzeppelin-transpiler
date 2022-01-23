// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

library RenameLibrary {
    function test() external {
    }
}

contract RenameContract {
}

contract RenameDeployer {
    RenameContract rc = RenameContract(address(0));

    constructor() {
        new RenameContract();
    }

    function deploy() external returns (RenameContract) {
        return new RenameContract();
    }

    function test() external {
        RenameLibrary.test();
    }
}
