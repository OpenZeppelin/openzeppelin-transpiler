# Changelog

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
