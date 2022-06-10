// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Strings {
    function toString(uint256) internal pure returns (string memory) {
        return "";
    }
}

library ECDSA {
    enum RecoverError {
        InvalidSignature
    }

    function tryRecover(bytes32, uint8, bytes32, bytes32) internal pure returns (address, RecoverError) {
        // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}
        return (address(0), RecoverError.InvalidSignature);
    }

    function toEthSignedMessageHash(bytes memory s) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", Strings.toString(s.length), s));
    }
}

/**
 * - https://docs.tokenbridge.net/eth-xdai-amb-bridge/about-the-eth-xdai-amb[ETH ⇌ xDai]
 * - https://docs.tokenbridge.net/eth-qdai-bridge/about-the-eth-qdai-amb[ETH ⇌ qDai]
 * - https://docs.tokenbridge.net/eth-etc-amb-bridge/about-the-eth-etc-amb[ETH ⇌ ETC]
 */
contract CrossChainEnabledAMB {
}

