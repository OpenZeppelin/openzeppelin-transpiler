import { ContractDefinition, VariableDeclaration } from 'solidity-ast';
import { isNodeType } from 'solidity-ast/utils';

import { StorageLayout } from '../../solc/input-output';
import { hasOverride } from '../../utils/upgrades-overrides';
import { decodeTypeIdentifier } from '../../utils/type-id';

function getNumberOfBytesOfValueType(type: string) {
  const details = type.match(/^t_(?<base>[a-z]+)(?<size>[\d]+)?$/);
  switch (details?.groups?.base) {
    case 'bool':
    case 'byte':
      return 1;
    case 'address':
      return 20;
    case 'bytes':
      return parseInt(details.groups.size, 10);
    case 'int':
    case 'uint':
      return parseInt(details.groups.size, 10) / 8;
    default:
      throw new Error(`Unsupported value type: ${type}`);
  }
}

function isStorageVariable(varDecl: VariableDeclaration): boolean {
  switch (varDecl.mutability) {
    case 'constant':
      return false;
    case 'immutable':
      return !hasOverride(varDecl, 'state-variable-immutable');
    default:
      return true;
  }
}

export class Layout {
  size: number;
  variables: (VariableDeclaration & { slot: number; offset: number; size: number })[];

  protected constructor() {
    this.size = 0;
    this.variables = [];
  }

  static fromContract(contractNode: ContractDefinition, layout: StorageLayout) {
    const instance = new Layout();

    for (const varDecl of contractNode.nodes.filter(isNodeType('VariableDeclaration'))) {
      if (isStorageVariable(varDecl)) {
        // try get type details
        const typeIdentifier = decodeTypeIdentifier(varDecl.typeDescriptions.typeIdentifier ?? '');
        const type = layout.types?.[typeIdentifier];

        // size of current object from type details, or try to reconstruct it if
        // they're not available try to reconstruct it, which can happen for
        // immutable variables
        const size = type
          ? parseInt(type.numberOfBytes, 10)
          : getNumberOfBytesOfValueType(typeIdentifier);

        instance.append(varDecl, size);
      }
    }
    return instance;
  }

  getPosition() {
    const slot = (this.size / 32) | 0;
    const offset = this.size % 32;
    const free = (32 - offset) % 32;
    return { slot, offset, free };
  }

  moveToFreeSlot() {
    const { free } = this.getPosition();
    this.size += free;
    return this;
  }

  append(varDecl: VariableDeclaration, numberOfBytes: number) {
    if (this.getPosition().free < numberOfBytes) {
      this.moveToFreeSlot();
    }

    const pos = this.getPosition();
    this.variables.push(
      Object.assign(
        {
          slot: pos.slot,
          offset: pos.offset,
          size: numberOfBytes,
        },
        varDecl,
      ),
    );
    this.size += numberOfBytes;

    return this;
  }
}
