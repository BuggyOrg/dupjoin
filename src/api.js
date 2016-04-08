
import {utils} from '@buggyorg/graphtools'
import _ from 'lodash'

export function duplicateOuts (graph) {
  return _(graph.nodes())
    .map((n) =>
      _(graph.outEdges(n))
        .map((e) => ({v: e.v, w: e.w, value: graph.edge(e)}))
        .map((e) => _.merge({}, e, {id: e.v + e.value.outPort}))
        .groupBy('id')
        .filter((n) => n.length > 1)
        .value())
    .compact()
    .flatten()
    .value()
}
/*
function duplicate (node, from, to) {
  return {
    v: `${node}_DUPLICATE_${from}_${to}`,
    value: {
      meta: 'control/duplicate',
      version: '0.1.0',
      inputPorts: {
        in: 'int'
      },
      outputPorts: {
        d1: 'int',
        d2: 'int'
      },
      atomic: true
    }
  }
}

function edge (from, to) {
  return {
    v: from.node,
    w: to.node,
    value: {
      outPort: from.port,
      inPort: to.port
    }
  }
}

function createDuplicates (node, successors, from = 0, to) {
  if (!to) to = successors.length - 1
  if (successors.length === 2) {
    var dup = duplicate(node, from, to)
    return {nodes: [dup], edges:
      [
        edge({node: dup.v, port: 'd1'}, successors[0]),
        edge({node: dup.v, port: 'd2'}, successors[1]),
        edge({node: node.node, port: node.port}, {node: dup.v, port: 'in'})
      ]}
  } else {
    throw new Error('not yet implemented')
  }
}
*/
export function normalize (graph) {
  if (!utils.isNG(graph)) {
    throw new Error('Cannot normalize non NG.')
  }

  var editGraph = utils.edit(graph)
  // var multiOuts = duplicateOuts(graph)

  return utils.finalize(editGraph)
}
