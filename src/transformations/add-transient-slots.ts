import { ContractDefinition, SourceUnit, VariableDeclaration } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import path from 'path';

import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';
import { Transformation } from './type';
import { formatLines, Line } from './utils/format-lines';
import { getRealEndIndex } from './utils/get-real-end-index';
import { contractStartPosition } from './utils/contract-start-position';
import { erc7201Location, offsetLocation } from '../utils/erc7201';
import { relativePath } from '../utils/relative-path';

// `TransientSlot` only provides casts for these exact value types. Solidity allows
// any value type in transient storage, so anything else has to be rejected.
const SLOT_CASTS: Record<string, string> = {
  address: 'asAddress',
  bool: 'asBoolean',
  bytes32: 'asBytes32',
  uint256: 'asUint256',
  int256: 'asInt256',
};

const ZERO_VALUES: Record<string, string> = {
  address: 'address(0)',
  bool: 'false',
  bytes32: 'bytes32(0)',
  uint256: '0',
  int256: '0',
};

export function getTransientBaseName(contractName: string): string {
  return contractName + 'StorageTransientLocation';
}

function getTransientSlotName(contractName: string, varName: string): string {
  return `${contractName}_${varName}_TransientSlot`;
}

export function isTransientVariable(node: Node): node is VariableDeclaration {
  return (
    node.nodeType === 'VariableDeclaration' &&
    node.stateVariable &&
    node.storageLocation === 'transient'
  );
}

function getTransientVariables(contract: ContractDefinition): VariableDeclaration[] {
  return contract.nodes.filter(isTransientVariable);
}

interface SlotInfo {
  name: string;
  cast: string;
  type: string;
}

export function addTransientSlots(
  transientSlotPath: string,
  include?: (source: string) => boolean,
  peerProject?: string,
) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    if (!include?.(sourceUnit.absolutePath)) {
      return;
    }

    const { error, resolver, originalSourceBuf } = tools;

    // Collect and validate everything up front so we know whether the import is needed.
    const contracts: [ContractDefinition, VariableDeclaration[], Map<number, SlotInfo>][] = [];
    const slotsByContract = new Map<number, Map<number, SlotInfo>>();

    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      const transientVars = getTransientVariables(contract);

      if (transientVars.length === 0) {
        continue;
      }

      const base = erc7201Location(`openzeppelin.storage.${contract.name}.transient`);
      const single = transientVars.length === 1;
      const slots = new Map<number, SlotInfo>();

      transientVars.forEach(v => {
        const type = v.typeDescriptions.typeString ?? '';
        const cast = SLOT_CASTS[type];

        if (cast === undefined) {
          throw error(
            v,
            `Unsupported transient variable type '${type}' ` +
              `(supported: ${Object.keys(SLOT_CASTS).join(', ')})`,
          );
        }

        if (v.visibility === 'public') {
          throw error(v, 'Cannot transform a public transient variable: its getter would be lost');
        }

        slots.set(v.id, {
          name: single
            ? getTransientBaseName(contract.name)
            : getTransientSlotName(contract.name, v.name),
          cast,
          type,
        });
      });

      contracts.push([contract, transientVars, slots]);
      slotsByContract.set(contract.id, slots);
    }

    const alreadyImported = [...findAll('ImportDirective', sourceUnit)].some(imp =>
      imp.symbolAliases.some(a => (a.local ?? a.foreign.name) === 'TransientSlot'),
    );

    if (contracts.length > 0 && !alreadyImported) {
      let last: Node | undefined;
      for (const node of findAll('PragmaDirective', sourceUnit)) {
        last = node;
      }
      for (const node of findAll('ImportDirective', sourceUnit)) {
        last = node;
      }

      const importPath = peerProject
        ? path.join(peerProject, transientSlotPath)
        : relativePath(path.dirname(sourceUnit.absolutePath), transientSlotPath);

      const after = last ? getNodeBounds(last) : { start: 0, length: 0 };

      yield {
        kind: 'append-transient-slot-import',
        start: after.start + after.length,
        length: 0,
        text: `\nimport {TransientSlot} from "${importPath}";`,
      };
    }

    for (const [contract, transientVars, slots] of contracts) {
      const id = `openzeppelin.storage.${contract.name}.transient`;
      const base = erc7201Location(id);
      const baseName = getTransientBaseName(contract.name);

      // Declare the namespace base, plus one constant per variable when there is
      // more than one, so that no reference needs slot arithmetic at the use site.
      const lines: Line[] = [
        ``,
        `using TransientSlot for *;`,
        ``,
        `// keccak256(abi.encode(uint256(keccak256("${id}")) - 1)) & ~bytes32(uint256(0xff))`,
        `bytes32 private constant ${baseName} = ${base};`,
      ];

      if (transientVars.length > 1) {
        lines.push(``);
        transientVars.forEach((v, i) => {
          lines.push(`// ${baseName} + ${i}`);
          lines.push(
            `bytes32 private constant ${slots.get(v.id)!.name} = ${offsetLocation(base, i)};`,
          );
        });
      }

      yield {
        kind: 'add-transient-slots',
        start: contractStartPosition(contract, tools),
        length: 0,
        text: formatLines(1, lines).trimEnd() + '\n',
      };

      // Drop the declarations, taking the whole line with them. The range must not
      // reach past the start of the contract body, or it would swallow text that
      // earlier transformations inserted there.
      const bodyStart = contractStartPosition(contract, tools);

      for (const v of transientVars) {
        let start = getNodeBounds(v).start;
        let end = getRealEndIndex(v, tools) + 1;

        while (
          start > bodyStart &&
          (originalSourceBuf[start - 1] === 0x20 || originalSourceBuf[start - 1] === 0x09)
        ) {
          start -= 1;
        }

        if (start > bodyStart && originalSourceBuf[start - 1] === 0x0a) {
          // Take the preceding newline, so no blank line is left behind.
          start -= 1;
        } else if (originalSourceBuf[end] === 0x0a) {
          // First member of the body: take the trailing newline instead.
          end += 1;
        }

        yield {
          kind: 'remove-transient-var',
          start,
          length: end - start,
          text: '',
        };
      }
    }

    // Every contract is scanned, not just the ones declaring transient variables, so
    // that a reference to an inherited transient variable is reported instead of being
    // silently left pointing at a declaration that has been removed.
    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      const slots = slotsByContract.get(contract.id) ?? new Map<number, SlotInfo>();

      const resolveTransient = (node: Node): SlotInfo | undefined => {
        if (node.nodeType !== 'Identifier' || node.referencedDeclaration == null) {
          return undefined;
        }
        const decl = resolver.tryResolveNode('VariableDeclaration', node.referencedDeclaration);
        if (!decl || !isTransientVariable(decl)) {
          return undefined;
        }
        const slot = slots.get(decl.id);
        if (slot === undefined) {
          // The slot constants are private, so an inherited transient variable would
          // resolve to a name the derived contract cannot reach.
          throw error(node, 'Transient variables must be declared in the contract that uses them');
        }
        return slot;
      };

      const scopes: Node[] = [
        ...findAll('FunctionDefinition', contract),
        ...findAll('ModifierDefinition', contract),
      ];

      for (const scope of scopes) {
        const consumed = new Set<number>();

        // Only an assignment in statement position can become a `tstore` call,
        // because the call has no value to hand back to an enclosing expression.
        const statementExpressions = new Set<number>();
        for (const stmt of findAll('ExpressionStatement', scope)) {
          statementExpressions.add(stmt.expression.id);
        }

        for (const asg of findAll('Assignment', scope)) {
          const slot = resolveTransient(asg.leftHandSide);
          if (slot === undefined) {
            continue;
          }
          if (!statementExpressions.has(asg.id)) {
            throw error(
              asg,
              'Cannot transform an assignment to a transient variable whose value is used',
            );
          }

          consumed.add(asg.leftHandSide.id);

          const store = `${slot.name}.${slot.cast}().tstore(`;
          const lhsBounds = getNodeBounds(asg.leftHandSide);
          const rhsBounds = getNodeBounds(asg.rightHandSide);
          const asgBounds = getNodeBounds(asg);

          // Replace everything up to the right hand side, leaving it untouched so
          // that any transient reads inside it are rewritten by the pass below.
          yield {
            kind: 'transient-assign-open',
            start: lhsBounds.start,
            length: rhsBounds.start - lhsBounds.start,
            text:
              asg.operator === '='
                ? store
                : `${store}${slot.name}.${slot.cast}().tload() ${asg.operator.slice(0, -1)} (`,
          };

          yield {
            kind: 'transient-assign-close',
            start: asgBounds.start + asgBounds.length,
            length: 0,
            text: asg.operator === '=' ? ')' : '))',
          };
        }

        for (const unary of findAll('UnaryOperation', scope)) {
          const slot = resolveTransient(unary.subExpression);
          if (slot === undefined) {
            continue;
          }

          const load = `${slot.name}.${slot.cast}().tload()`;
          const store = `${slot.name}.${slot.cast}().tstore`;
          let text;

          if (unary.operator === 'delete') {
            text = `${store}(${ZERO_VALUES[slot.type]})`;
          } else if (unary.operator === '++' || unary.operator === '--') {
            if (slot.type !== 'uint256' && slot.type !== 'int256') {
              throw error(unary, `Cannot apply '${unary.operator}' to a transient ${slot.type}`);
            }
            text = `${store}(${load} ${unary.operator[0]} 1)`;
          } else {
            continue;
          }

          if (!statementExpressions.has(unary.id)) {
            throw error(
              unary,
              `Cannot transform '${unary.operator}' on a transient variable whose value is used`,
            );
          }

          consumed.add(unary.subExpression.id);

          const bounds = getNodeBounds(unary);
          yield { kind: 'transient-unary', start: bounds.start, length: bounds.length, text };
        }

        for (const ref of findAll('Identifier', scope)) {
          const slot = resolveTransient(ref);
          if (slot === undefined || consumed.has(ref.id)) {
            continue;
          }

          const bounds = getNodeBounds(ref);
          yield {
            kind: 'transient-read',
            start: bounds.start,
            length: bounds.length,
            text: `${slot.name}.${slot.cast}().tload()`,
          };
        }
      }
    }
  };
}
