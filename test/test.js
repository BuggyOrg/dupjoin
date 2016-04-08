import chai from 'chai'
import fs from 'fs'
import graphlib from 'graphlib'
import * as api from '../src/api'
import _ from 'lodash'

var expect = chai.expect

describe('Out edges deduplication', () => {
  it('Should detect multiple outputs', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/multiOut1.json', 'utf8')))
    var doublets = api.duplicateOuts(graph)
    expect(doublets).to.have.length(1)
  })
})