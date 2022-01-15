// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev This is a base storage for the  initialization function for upgradeable diamond facet contracts
**/

library InitializableStorage {

  struct Layout {
<<<<<<< HEAD
    /*
    * Indicates that the contract has been initialized.
    */
    bool _initialized;

    /*
    * Indicates that the contract is in the process of being initialized.
=======
    /**
    * @dev Indicates that the contract has been initialized.
    */
    bool _initialized;

    /**
    * @dev Indicates that the contract is in the process of being initialized.
>>>>>>> 080f60b... wip - adding testing for solc 0.8.0 and diamond storage generation
    */
    bool _initializing;
  }

  bytes32 internal constant STORAGE_SLOT = keccak256('openzepplin.contracts.storage.initializable.facet');

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
