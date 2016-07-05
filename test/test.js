/* global describe, it */
import chai from 'chai'
import fs from 'fs'
import graphlib from 'graphlib'
import {walk} from '@buggyorg/graphtools'
import * as api from '../src/api'
// import _ from 'lodash'

var expect = chai.expect

describe('Out edges deduplication', () => {
  it('should detect two outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0][0].type).to.equal('string')
  })

  it('should detect multiple outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0]).to.have.length(3)
    expect(doublets[0][0].type).to.equal('string')
  })

  it('should detect two inputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn1.json', 'utf8')))
    var doublets = api.multipleIns(graph)
    expect(doublets).to.have.length(1)
  })

  it('should detect multiple inputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn2.json', 'utf8')))
    var doublets = api.multipleIns(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0]).to.have.length(3)
  })

  it('should detect all inputs in the ackermann example', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/ack.json', 'utf8')))
    var multis = api.multipleOuts(graph)
    expect(multis).to.have.length(2)
  })

  it('normalizes double out edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var doublets = api.multipleOuts(newGraph)
    expect(doublets).to.have.length(0)
  })

  it('normalizes multiple out edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var triplets = api.multipleOuts(newGraph)
    expect(triplets).to.have.length(0)
  })

  it('normalizes double in edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn1.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var doublets = api.multipleIns(newGraph)
    expect(doublets).to.have.length(0)
  })

  it('normalizes multiple in edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn2.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var triplets = api.multipleIns(newGraph)
    expect(triplets).to.have.length(0)
  })

  it('assigns the edge type to the duplicate nodes', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var newGraph = api.normalize(graph)
    expect(newGraph.node('A_output_DUPLICATE_0_2').inputPorts['in']).to.equal('string')
    expect(newGraph.node('A_output_DUPLICATE_0_2').settings.isGeneric).to.be.true
    expect(newGraph.node('A_output_DUPLICATE_0_2').settings.genericType).to.equal('string')
  })

  it('should normalize the ackermann example correctly', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/ack.json', 'utf8')))
    var normAck = api.normalize(graph)
    expect(normAck).to.be.ok
    expect(normAck.edges()).to.have.length(38)
  })

  it('should detect multiple outputs in a real scenario', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(4)
  })

  it('normalizes multiple out edges in real scenario', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var doublets = api.multipleOuts(newGraph)
    expect(doublets).to.have.length(0)
  })

  it('should detect multiple inputs in a real scenario', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
    var doublets = api.multipleIns(graph)
    expect(doublets).to.have.length(2)
  })

  it('should add a consume node for every unused port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/nop.json', 'utf8')))
    var norm = api.normalize(graph)
    expect(walk.successor(norm, 'a_1', 'y')).to.have.length(1)
    expect(norm.node(walk.successor(norm, 'a_1', 'y')[0].node).id).to.equal('control/consume')
    expect(norm.node(walk.successor(norm, 'a_1', 'y')[0].node).settings.argumentOrdering).to.eql(['all'])
    expect(norm.node(walk.successor(norm, 'a_1', 'y')[0].node).inputPorts.all).to.equal('number')
  })

  it('rewrites edges that go right through compound nodes', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/emptyCompound.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var idNode = newGraph.nodes().filter((n) => newGraph.node(n).id === 'std/id')[0]

    expect(newGraph.edges()).to.have.length(3)
    expect(newGraph.parent(idNode)).to.equal('nop_1')

    const edge1 = newGraph.edge(newGraph.edges().filter((e) => e.v === 'nop_1' && e.w === idNode)[0])
    const edge2 = newGraph.edge(newGraph.edges().filter((e) => e.v === idNode && e.w === 'nop_1')[0])

    expect(edge1.outPort).to.equal('in')
    expect(edge1.inPort).to.equal('input')
    expect(edge2.outPort).to.equal('output')
    expect(edge2.inPort).to.equal('out')
  })
})
