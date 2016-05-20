/* global describe, it */
import chai from 'chai'
import fs from 'fs'
import graphlib from 'graphlib'
import * as api from '../src/api'
// import _ from 'lodash'

var expect = chai.expect

describe('Out edges deduplication', () => {
  it('should detect two outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
  })

  it('should detect multiple outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0]).to.have.length(3)
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
})

