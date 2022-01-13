pragma solidity ^0.6.0;

library RenameLibrary {
    function test() external {
    }
}

contract RenameContract {
}

contract RenameDeployer {
    RenameContract rc = RenameContract(0);

    constructor() public {
        new RenameContract();
    }

    function deploy() external returns (RenameContract) {
        return new RenameContract();
    }

    function test() external {
        RenameLibrary.test();
    }
}
