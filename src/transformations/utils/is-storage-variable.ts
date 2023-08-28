import { VariableDeclaration } from 'solidity-ast';
import { ASTResolver } from '../../ast-resolver';
import { hasOverride } from '../../utils/upgrades-overrides';

export function isStorageVariable(varDecl: VariableDeclaration, resolver: ASTResolver): boolean {
  if (!varDecl.stateVariable || varDecl.constant) {
    return false;
  } else {
    switch (varDecl.mutability) {
      case 'constant':
        // It's unclear if `varDecl.constant` and `varDecl.mutability === 'constant'` are equivalent so we use both just in case.
        return false;
      case 'immutable':
        return !hasOverride(varDecl, 'state-variable-immutable', resolver);
      default:
        return true;
    }
  }
}
