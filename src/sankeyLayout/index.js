/**
 * Original, full-width node positioning.
 *
 * Uses spacing and whitespace fraction to position nodes within layers.
 *
 * @module node-positioning/justified
 */

import { sum } from 'd3-array'
import nestGraph from './nest-graph.js'
import positionHorizontally from './horizontal.js'
import positionVertically from './verticalJustified.js'
import orderLinks from './link-ordering.js'
import layoutLinks from './layout-links.js'

export default function sankeyLayout () {
  var size = [1, 1]
  var scale = null
  var edgeValue = function (e) { return e.data.value }
  var whitespace = 0.5
  var verticalLayout = positionVertically()

  function position (graph) {
    if (scale === null) position.scaleToFit(graph)

    // set node and edge sizes
    setNodeValues(graph, edgeValue, scale)
    const nested = nestGraph(graph)

    // position nodes
    verticalLayout(nested, size[1], whitespace)
    positionHorizontally(nested, size[0])

    // sort & position links
    orderLinks(graph)
    layoutLinks(graph)

    return graph
  }

  position.scaleToFit = function (graph) {
    setNodeValues(graph, edgeValue, scale)
    const nested = nestGraph(graph)
    const maxValue = sum(nested.bandValues)
    if (maxValue <= 0) {
      scale = 1
    } else {
      scale = size[1] / maxValue
      if (whitespace !== 1) scale *= (1 - whitespace)
    }
    return position
  }

  position.size = function (x) {
    if (!arguments.length) return size
    size = x
    return position
  }

  position.whitespace = function (x) {
    if (!arguments.length) return whitespace
    whitespace = x
    return position
  }

  position.scale = function (x) {
    if (!arguments.length) return scale
    scale = x
    return position
  }

  position.edgeValue = function (x) {
    if (!arguments.length) return edgeValue
    edgeValue = x
    return position
  }

  position.verticalLayout = function (x) {
    if (!arguments.length) return verticalLayout
    verticalLayout = required(x)
    return position
  }

  return position
}

function setNodeValues (graph, edgeValue, scale) {
  graph.edges().forEach(d => {
    d.value = edgeValue(d)
    d.dy = d.value * scale
  })

  graph.nodes().forEach(d => {
    const incoming = sum(d.incoming, d => d.value)
    const outgoing = sum(d.outgoing, d => d.value)
    d.value = Math.max(incoming, outgoing)
    d.dy = d.value * scale
  })

  graph.dummyNodes().forEach(d => {
    d.value = sum(d.edges, d => d.value)
    d.dy = d.value * scale
  })
}

function required (f) {
  if (typeof f !== 'function') throw new Error()
  return f
}