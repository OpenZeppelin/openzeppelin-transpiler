import { getNodeSources, getConstructor, stripBraces } from '../solc/ast-utils';
import { getVarInits } from './get-var-inits';
import { Transformation } from '../transformation';
import { buildSuperCallsForChain } from './build-super-calls-for-chain';
import { ContractDefinition } from '../solc/ast-node';
import { Artifact } from '../solc/artifact';

function getVarInitsPart(contractNode: ContractDefinition, source: string): string {
  return getVarInits(contractNode, source)
    .map(([vr, , match]) => `\n        ${vr.name} ${match[2]};`)
    .join('');
}

export function transformConstructor(
  contractNode: ContractDefinition,
  source: string,
  contracts: Artifact[],
  contractsToArtifactsMap: Record<string, Artifact>,
): Transformation {
  const superCalls = buildSuperCallsForChain(contractNode, contracts, contractsToArtifactsMap);

  const declarationInserts = getVarInitsPart(contractNode, source);

  const constructorNode = getConstructor(contractNode);

  let constructorBodySource = '';
  let constructorParameterList = '';
  let constructorArgsList = '';

  if (constructorNode) {
    constructorBodySource = stripBraces(getNodeSources(constructorNode.body, source)[2]);
    constructorParameterList = stripBraces(getNodeSources(constructorNode.parameters, source)[2]);
    constructorArgsList = constructorNode.parameters.parameters.map(par => par.name).join(', ');
  }

  let bounds: { start: number, end: number };

  if (constructorNode) {
    const [start, len] = getNodeSources(constructorNode, source);
    bounds = {
      start,
      end: start + len,
    };
  } else {
    const [contractStart, , contractSource] = getNodeSources(contractNode, source);
    const match = /.*\bcontract[^\{]*{/.exec(contractSource);
    if (match == undefined) {
      throw new Error(`Can't find contract pattern in ${contractSource}`);
    }
    const inside = contractStart + match[0].length;
    bounds = {
      start: inside,
      end: inside,
    };
  }

  const isMock = contractsToArtifactsMap[contractNode.name].sourcePath.includes('mocks');
  const isERC20Owned = contractNode.name === '__unstable__ERC20Owned';

  const isConstructorPayable = constructorNode?.stateMutability === 'payable';

  const mockConstructor = !(isMock || isERC20Owned) ? '' : `
    constructor(${constructorParameterList}) public ${isConstructorPayable ? 'payable' : ''} {
        __${contractNode.name}_init(${constructorArgsList});
    }\n`;

  const isPreset = contractNode.name.includes('Preset') && !isMock;

  const presetConstructor = !isPreset ? '' : `
    function initialize(${constructorParameterList}) public {
        __${contractNode.name}_init(${constructorArgsList});
    }\n`;

  return {
    ...bounds,
    kind: 'transform-constructor',
    text: `${mockConstructor}${presetConstructor}
    function __${contractNode.name}_init(${constructorParameterList}) internal initializer {${superCalls}
        __${contractNode.name}_init_unchained(${constructorArgsList});
    }

    function __${contractNode.name}_init_unchained(${constructorParameterList}) internal initializer {
        ${declarationInserts}
        ${constructorBodySource}
    }\n`,
  };
}
