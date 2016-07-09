
import {utils, walk, graph as graphAPI} from '@buggyorg/graphtools'
import _ from 'lodash'

const defaultOptions = {
  createDuplicatesAndJoins: true,
  createIdNodes: true,
  addConsumeNodes: true
}

export function multipleOuts (graph) {
  return _(graph.nodes())
    .map((n) =>
      _(graph.outEdges(n))
        .map((e) => ({v: e.v, w: e.w, value: graph.edge(e)}))
        .reject((e) => e.value.continuation)
        .map((e) => _.merge({}, e, {id: e.v + e.value.outPort, type: utils.portType(graph, e.v, e.value.outPort)}))
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
        .reject((e) => e.value.continuation)
        .map((e) => _.merge({}, e, {id: e.w + e.value.inPort, type: utils.portType(graph, e.w, e.value.inPort)}))
        .groupBy('id')
        .filter((n) => n.length > 1)
        .value())
    .compact()
    .flatten()
    .value()
}

function duplicate (node, from, to) {
  var generic = (node.type && typeof (node.type) === 'string' && node.type.indexOf('generic') === -1) ? {
    isGeneric: true,
    genericType: node.type
  } : {}
  return _.merge({
    v: `${node.node}_${node.port}_DUPLICATE_${from}_${to}`,
    value: {
      id: 'control/duplicate',
      version: '0.3.0',
      inputPorts: {
        in: node.type
      },
      outputPorts: {
        d1: node.type,
        d2: node.type
      },
      atomic: true,
      settings: {
        argumentOrdering: ['in', 'd1', 'd2']
      }
    },
    parent: node.parent
  }, {value: {settings: generic}})
}

function join (node, from, to) {
  var generic = (node.type && typeof (node.type) === 'string' && node.type.indexOf('generic') === -1) ? {
    isGeneric: true,
    genericType: node.type
  } : {}
  return _.merge({
    v: `${node.node}_${node.port}_JOIN_${from}_${to}`,
    value: {
      id: 'control/join',
      version: '0.3.0',
      inputPorts: {
        in1: node.type,
        in2: node.type
      },
      outputPorts: {
        to: node.type
      },
      atomic: true,
      specialForm: true,
      settings: {
        argumentOrdering: ['in1', 'in2', 'to']
      }
    },
    parent: node.parent
  }, {value: {settings: generic}})
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
    var d1 = createDuplicates({node: dup.v, port: 'd1', parent: node.parent, type: node.type}, successors, from, Math.floor((from + to) / 2))
    var d2 = createDuplicates({node: dup.v, port: 'd2', parent: node.parent, type: node.type}, successors, Math.floor((from + to) / 2) + 1, to)
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
    var d1 = createJoins({node: jn.v, port: 'in1', parent: node.parent, type: node.type}, predecessors, from, Math.floor((from + to) / 2))
    var d2 = createJoins({node: jn.v, port: 'in2', parent: node.parent, type: node.type}, predecessors, Math.floor(from + to) / 2 + 1, to)
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

function createEdge (graph, source, target) {
  const edgeName = `${source.node}@${source.port}_to_${target.node}@${target.port}`
  graph.setEdge(source.node, target.node, {
    outPort: source.port,
    inPort: target.port
  }, edgeName)
}

/**
 * Inserts std/id nodes whenever an edge goes right through a compound node.
 * @param jsonGraph {object} network port graph as jsonGraph
 * @returns {object} NPG as json
 */
function rewriteEdgesThroughCompoundNodes (jsonGraph) {
  const graph = graphAPI.importJSON(jsonGraph)

  graph.edges().forEach((e) => {
    if (e.v === e.w) {
      const edge = graph.edge(e)
      const compound = graph.node(e.v)
      const idNode = `id_${e.v}@${edge.outPort}_to_${e.w}@${edge.inPort}`
      graph.setNode(idNode, {
        id: 'std/id',
        version: '0.1.2',
        atomic: true,
        inputPorts: {
          input: compound.outputPorts[edge.inPort]
        },
        outputPorts: {
          output: compound.inputPorts[edge.outPort]
        },
        settings: {
          argumentOrdering: ['input', 'output']
        }
      })
      graph.setParent(idNode, e.v)
      createEdge(graph, { node: e.v, port: edge.outPort }, { node: idNode, port: 'input' })
      createEdge(graph, { node: idNode, port: 'output' }, { node: e.v, port: edge.inPort })
      graph.removeEdge(e)
    }
  })

  return graphAPI.toJSON(graph)
}

function isLambda (graph, n) {
  return n && graph.node(n) && graph.node(n).id === 'functional/lambda'
}

function addConsumeForUnusedPorts (jsonGraph) {
  const graph = graphAPI.importJSON(jsonGraph)

  graph.nodes().forEach((n) => {
    const node = graph.node(n)

    if (!isLambda(graph, graph.parent(n))) {
      Object.keys(node.outputPorts).forEach((port) => {
        if (walk.successor(graph, n, port).length === 0) {
          const dummyNode = `${n}_consume_dummy_${port}`
          graph.setNode(dummyNode, {
            id: 'control/consume',
            version: '0.2.0',
            atomic: true,
            inputPorts: {
              all: node.outputPorts[port]
            },
            settings: {
              argumentOrdering: ['all']
            }
          })
          createEdge(graph, { node: n, port }, { node: dummyNode, port: 'all' })
        }
      })
    }

    if (!node.atomic && !node.recursive) {
      Object.keys(node.inputPorts).forEach((port) => {
        if (walk.successor(graph, n, port).length === 0) {
          const dummyNode = `${n}_consume_dummy_${port}`
          graph.setNode(dummyNode, {
            id: 'control/consume',
            version: '0.2.0',
            atomic: true,
            inputPorts: {
              all: node.inputPorts[port]
            },
            settings: {
              argumentOrdering: ['all']
            }
          })
          graph.setParent(dummyNode, n)
          createEdge(graph, { node: n, port }, { node: dummyNode, port: 'all' })
        }
      })
    }
  })

  return graphAPI.toJSON(graph)
}

function createDupJoins (editGraph, graph) {
  var multiOuts = multipleOuts(graph)
  var multiIns = multipleIns(graph)
  var dupsOut = _.reduce(_.compact(_.map(multiOuts, (e) => {
    if (e[0].value.outPort) {
      return createDuplicates({node: e[0].v, port: e[0].value.outPort, parent: parent(graph, e[0].v, _.last(e).w), type: e[0].type},
        walk.adjacentNode(graph, e[0].v, e[0].value.outPort, walk.successor))
    }
  })), mergeNodes, {nodes: [], edges: []})
  var dupsIn = _.reduce(_.map(multiIns, (e) => {
    if (e[0].value.outPort) {
      return createJoins({node: e[0].w, port: e[0].value.inPort, parent: graph.parent(e[0].v), type: e[0].type},
        walk.adjacentNode(graph, e[0].w, e[0].value.inPort, walk.predecessor))
    }
  }), mergeNodes, {nodes: [], edges: []})

  var removeEdges = _.flatten(_.map(_.mergeWith({}, multiOuts, multiIns, customizer), (v) => v))
  var shouldRemove = (e) => _.find(removeEdges, (r) => {
    return r.v === e.v && r.w === e.w && r.value.outPort === e.value.outPort && r.value.inPort === e.value.inPort
  })
  var oldEdges = _.reject(editGraph.edges, shouldRemove)

  editGraph.nodes = _.compact(_.concat(editGraph.nodes, dupsIn.nodes, dupsOut.nodes))
  editGraph.edges = _.compact(_.concat(oldEdges, dupsIn.edges, dupsOut.edges))
  return editGraph
}

export function normalize (graph, options) {
  options = options || {}
  options = _.merge({}, defaultOptions, options)
  if (!utils.isNPG(graph)) {
    throw new Error('Cannot normalize non NPG.')
  }

  var editGraph = graphAPI.toJSON(graph)
  if (options.createDuplicatesAndJoins) {
    editGraph = createDupJoins(editGraph, graph)
  }
  if (options.createIdNodes) {
    editGraph = rewriteEdgesThroughCompoundNodes(editGraph)
  }
  if (options.addConsumeNodes) {
    editGraph = addConsumeForUnusedPorts(editGraph)
  }

  return graphAPI.importJSON(editGraph)
}
