/* global describe, it */
import chai from 'chai'
import fs from 'fs'
import graphlib from 'graphlib'
import * as api from '../src/api'
// import _ from 'lodash'

var expect = chai.expect

describe('Out edges deduplication', () => {
  it('Should detect two outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
  })

  it('Should detect multiple outputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var doublets = api.multipleOuts(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0]).to.have.length(3)
  })

  it('Should detect two inputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn1.json', 'utf8')))
    var doublets = api.multipleIns(graph)
    expect(doublets).to.have.length(1)
  })

  it('Should detect multiple inputs from one port', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn2.json', 'utf8')))
    var doublets = api.multipleIns(graph)
    expect(doublets).to.have.length(1)
    expect(doublets[0]).to.have.length(3)
  })

  it('Normalizes double out edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var doublets = api.multipleOuts(newGraph)
    expect(doublets).to.have.length(0)
  })

  it('Normalizes multiple out edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut2.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var triplets = api.multipleOuts(newGraph)
    expect(triplets).to.have.length(0)
  })

  it('Normalizes double in edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn1.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var doublets = api.multipleOuts(newGraph)
    expect(doublets).to.have.length(0)
  })

  it('Normalizes multiple in edges', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiIn2.json', 'utf8')))
    var newGraph = api.normalize(graph)
    var triplets = api.multipleOuts(newGraph)
    expect(triplets).to.have.length(0)
  })
})

