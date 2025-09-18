# Changelog

## 0.4.1 (2025-09-18)

- Revert part 0.4.0: Do not automatically delete initialisable contracts when "delete originals" is enabled (in perr project mode).

## 0.4.0 (2025-09-18)

- Breaking: Do not automatically exclude files ending in `Upgradeable.sol`.
- Breaking: When in peer project mode, use Initializable from the peer. If the "delete originals" option is enabled, do not keep Initializable and the already initialisable contracts.

## 0.3.33 (2023-12-8)

- Improve code compatibility with older versions of node.

## 0.3.32 (2023-09-30)

- Revert 0.3.31 changes.

## 0.3.31 (2023-09-30)

- (Reverted in 0.3.32) ~Simplify peer project mode by renaming imported peer symbols.~

## 0.3.30 (2023-09-27)

- Fix `@inheritdoc` in peer project mode.

## 0.3.29 (2023-09-26)

- Add a NatSpec annotation `@custom:stateless` to skip transpiling annotated contracts in peer project mode.

## 0.3.28 (2023-09-25)

- Add an option to skip transpilation of items that don't need it (e.g. interfaces), by fetching them from a "peer project". This is set by using the new `-q` flag.

## 0.3.27 (2023-08-29)

- Throw error when using `@custom:storage-size` along with namespaced storage.

## 0.3.26 (2023-08-28)

- Change location of initializer functions when the original contract doesn't have a constructor. Previously it would be the start of the contract, before state variables. It is now placed immediately before the first function of the contract, if the contract has functions.
- Add namespaced storage as an alternative to gaps `-n` enables namespaces, and `-N` excludes specific files from namespaces.

## 0.3.25 (2023-07-05)

- Allow immutable variable assignment given `unsafe-allow state-variable-immutable`. Previously `unsafe-allow state-variable-assignment` was required as well.

## 0.3.24 (2023-05-04)

- Allow constructor override at contract level.

## 0.3.23 (2023-05-04)

- Switch AST resolver to faster implementation.
- Consider unsafe-allow at contract level.

## 0.3.22 (2023-04-26)

- Add `-W` option to skip `WithInit` generation.

## 0.3.21 (2023-02-17)

- Generate `WithInit` contract variant for abstract but fully implemented contracts.

## 0.3.20 (2023-02-11)

- Fix support for immutable variables of user defined value types.

## 0.3.19 (2022-09-24)

- Add license header to WithInit.sol.

## 0.3.18 (2022-09-23)

- Fix ignored `-b` flag.

## 0.3.17 (2022-09-23)

- Add info to error message.

## 0.3.16 (2022-09-23)

- Add -b flag to manually pass build info file path.

## 0.3.13 (2022-03-31)

- Transform new expressions in variable initializations.
- Fix WithInit contracts when there is a constructor override.

## 0.3.12 (2022-03-31)

- Fix transpilation of new statements when immediately cast to address.

## 0.3.11 (2022-03-11)

- Fix evaluation of the size of value type variables that are not documented in the layout, adding support for enum, contracts and payable addresses.

## 0.3.10 (2022-03-08)

- Fix gap size when immutable variables are transpiled to storage, and add `@custom:storage-size` override to customize gap size.

## 0.3.9 (2022-02-11)

- Add `@dev` tag to gap variable natspec.

## 0.3.8 (2022-02-08)

- Fix wrong assumption that Identifier maps to VariableDeclaration.

## 0.3.7 (2022-02-08)

- Fix bug when removing abstract parents too eagerly.

## 0.3.6 (2022-01-31)

- Remove calls to empty self unchained method from init method body, and empty parent unchained methods calls without parameters.
- Persist modifiers on constructors.
- Add docstring to gap variable.

## 0.3.5 (2022-01-13)

- Delete unused parameter names in unchained initializers. Removes compiler warnings.
- Remove visibility from constructor in WithInit.sol file.

## 0.3.4 (2022-01-11)

- Fix @inheritdoc tags by renaming the contract name.

## 0.3.3 (2021-12-27)

- Fix bug in constructor transformation.

## 0.3.2 (2021-12-27)

- Add handling of 'unsafe-allow override'.

## 0.3.1 (2021-12-14)

- Add `initializer` modifier to WithInit constructors.

## 0.3.0 (2021-12-10)

- Breaking change: Use `onlyInitializing` modifier for internal initializer functions.

## 0.1.1 (2020-11-16)

- Support Solidity 0.7.

## 0.1.0 (2020-11-06)

- First release to npm.
