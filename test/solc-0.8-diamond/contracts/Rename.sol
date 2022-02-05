// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library RenameLibrary {
    function test() external {
    }
}

contract RenameContract {
}

contract RenameContractWithConstructor {

    constructor(int randomData) {
        int temp = randomData;
    }
}

contract RenameDeployer {
    RenameContract rc = RenameContract(address(0));

    constructor() {
        new RenameContract();
        new RenameContractWithConstructor(5);
    }

    function deploy() external returns (RenameContract) {
        return new RenameContract();
    }

    function test() external {
        RenameLibrary.test();
    }
}
