# OpenZeppelin Transpiler

A preprocessor that turns any Solidity smart contract into one suitable for use
with proxies.

_Proxies are a kind of contract deployment that enables features like
upgradeability and reduced cost._

## Usage

To run the transpiler on your contracts simply install it and run
`oz-transpile` in your project directory.

This will take all existing Solidity files and create their proxy-enabled
variants in an `__upgradeable__` directory.


