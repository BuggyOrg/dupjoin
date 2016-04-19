
import {utils, walk} from '@buggyorg/graphtools'
import _ from 'lodash'

export function multipleOuts (graph) {
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

export function multipleIns (graph) {
  return _(graph.nodes())
    .map((n) =>
      _(graph.inEdges(n))
        .map((e) => ({v: e.v, w: e.w, value: graph.edge(e)}))
        .map((e) => _.merge({}, e, {id: e.w + e.value.inPort}))
        .groupBy('id')
        .filter((n) => n.length > 1)
        .value())
    .compact()
    .flatten()
    .value()
}

function duplicate (node, from, to) {
  return {
    v: `${node.node}_DUPLICATE_${from}_${to}`,
    value: {
      id: 'control/duplicate',
      version: '0.2.0',
      inputPorts: {
        in: 'generic'
      },
      outputPorts: {
        d1: 'generic',
        d2: 'generic'
      },
      atomic: true
    },
    parent: node.parent
  }
}

function join (node, from, to) {
  return {
    v: `${node.node}_JOIN_${from}_${to}`,
    value: {
      id: 'control/join',
      version: '0.2.0',
      inputPorts: {
        in1: 'generic',
        in2: 'generic'
      },
      outputPorts: {
        to: 'generic'
      },
      atomic: true,
      specialForm: true
    },
    parent: node.parent
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
  to = to || successors.length - 1
  var dup = duplicate(node, from, to)
  if (to === from) {
    return {nodes: [], edges: [edge(node, successors[from])]}
  } else if (to - from === 1) {
    return {nodes: [dup], edges:
    [
      edge({node: dup.v, port: 'd1'}, successors[from]),
      edge({node: dup.v, port: 'd2'}, successors[to]),
      edge(node, {node: dup.v, port: 'in'})
    ]}
  } else {
    var d1 = createDuplicates({node: dup.v, port: 'd1', parent: node.parent}, successors, from, from + Math.floor((from + to) / 2))
    var d2 = createDuplicates({node: dup.v, port: 'd2', parent: node.parent}, successors, Math.ceil(from + Math.floor(from + to) / 2 + 1), to)
    return {
      nodes: _.concat(dup, d1.nodes, d2.nodes),
      edges: _.concat(d1.edges, d2.edges, edge(node, {node: dup.v, port: 'in'}))
    }
  }
}

function createJoins (node, predecessors, from = 0, to) {
  to = to || predecessors.length - 1
  var jn = join(node, from, to)
  if (to === from) {
    return {nodes: [], edges: [edge(predecessors[from], node)]}
  } else if (to - from === 1) {
    return {nodes: [jn], edges:
    [
      edge(predecessors[from], {node: jn.v, port: 'in1'}),
      edge(predecessors[to], {node: jn.v, port: 'in2'}),
      edge({node: jn.v, port: 'to'}, node)
    ]}
  } else {
    var d1 = createJoins({node: jn.v, port: 'in1', parent: node.parent}, predecessors, from, from + Math.floor((from + to) / 2))
    var d2 = createJoins({node: jn.v, port: 'in2', parent: node.parent}, predecessors, Math.ceil(from + Math.floor(from + to) / 2 + 1), to)
    return {
      nodes: _.concat(jn, d1.nodes, d2.nodes),
      edges: _.concat(d1.edges, d2.edges, edge({node: jn.v, port: 'to'}, node))
    }
  }
}

var mergeNodes = (acc, n) => {
  return {
    nodes: _.concat(acc.nodes, n.nodes),
    edges: _.concat(acc.edges, n.edges)
  }
}

function customizer (objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
}

var parent = function (graph, outP, inP) {
  if (graph.parent(outP) === graph.parent(inP)) {
    return graph.parent(outP)
  } else if (graph.parent(outP) === inP) {
    return inP
  } else {
    return outP
  }
}

export function normalize (graph) {
  if (!utils.isNG(graph)) {
    throw new Error('Cannot normalize non NG.')
  }

  var editGraph = utils.edit(graph)
  var multiOuts = multipleOuts(graph)
  var multiIns = multipleIns(graph)
  var dupsOut = _.reduce(_.map(multiOuts, (e) => {
    return createDuplicates({node: e[0].v, port: e[0].value.outPort, parent: parent(graph, e[0].v, _.last(e).w)},
      walk.successorInPort(graph, e[0].v, e[0].value.outPort))
  }), mergeNodes, {nodes: [], edges: []})
  var dupsIn = _.reduce(_.map(multiIns, (e) => {
    return createJoins({node: e[0].w, port: e[0].value.inPort, parent: graph.parent(e[0].v)},
      walk.predecessorOutPort(graph, e[0].w, e[0].value.inPort))
  }), mergeNodes, {nodes: [], edges: []})

  var removeEdges = _.flatten(_.map(_.mergeWith({}, multiOuts, multiIns, customizer), (v) => v))
  var shouldRemove = (e) => _.find(removeEdges, (r) => {
    return r.v === e.v && r.w === e.w && r.value.outPort === e.value.outPort && r.value.inPort === e.value.inPort
  })
  var oldEdges = _.reject(editGraph.edges, shouldRemove)

  editGraph.nodes = _.compact(_.concat(editGraph.nodes, dupsIn.nodes, dupsOut.nodes))
  editGraph.edges = _.compact(_.concat(oldEdges, dupsIn.edges, dupsOut.edges))
  return utils.finalize(editGraph)
}
