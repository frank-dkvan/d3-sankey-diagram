import sankey from '../src/sankey.js'
import tape from 'tape'
import { assertAlmostEqual } from './assert-almost-equal'

tape('sankey: scale', test => {
  const {graph, ordering} = example4to1()
  const pos = sankey().ordering(ordering)

  test.equal(pos.scale(), null, 'initially scale is null')

  pos(graph)
  test.equal(pos.scale(), 1 / 20 * 0.5, 'default scaling with 50% whitespace')

  pos.whitespace(0).scale(null)(graph)
  test.equal(pos.scale(), 1 / 20 * 1.0, 'scaling with 0% whitespace')

  test.end()
})

tape('sankey() sets node.rank and node.depth', test => {
  const graph = {
    nodes: [
      {id: '0'},
      {id: '1'},
      {id: '2', direction: 'l'}
    ],
    links: [
      {source: '0', target: '1', value: 5},
      {source: '1', target: '2', value: 5}
    ]
  }
  sankey()(graph)

  test.deepEqual(nodeAttr(graph, d => d.rank), [0, 1, 1], 'node ranks')
  test.deepEqual(nodeAttr(graph, d => d.depth), [0, 0, 1], 'node depths')
  test.end()
})

tape('sankey() sets node.x and node.y', test => {
  const {graph, ordering} = example4to1()

  // 50% whitespace: scale = 8 / 20 * 0.5 = 0.2
  // margin = 8 * 50% / 5 = 0.8
  // total node height = 4 * 5 * 0.2 = 4
  // remaining space = 8 - 4 - 2*0.8 =2.4
  // spread betweeen 3 gaps = 0.8
  sankey().size([1, 8]).ordering(ordering)(graph)

  test.deepEqual(nodeAttr(graph, d => d.dy), [1, 1, 1, 1, 4], 'node heights')
  assertAlmostEqual(test, nodeAttr(graph, d => d.y), [
    0.8,
    0.8 + 1 + 0.8,
    0.8 + 1 + 0.8 + 1 + 0.8,
    0.8 + 1 + 0.8 + 1 + 0.8 + 1 + 0.8,
    2  // centred
  ], 1e-6, 'node y')

  assertAlmostEqual(test, nodeAttr(graph, d => d.x), [0, 0, 0, 0, 1], 'node x')
  test.end()
})

tape('sankey() sets link.dy and link.points', test => {
  const {graph, ordering} = example4to1()
  sankey().size([1, 8]).ordering(ordering)(graph)

  test.deepEqual(graph.links.map(l => l.dy), [1, 1, 1, 1], 'link thicknesses')

  const n0 = graph.nodes[0]
  const n4 = graph.nodes[4]
  const l0 = graph.links[0]
  assertAlmostEqual(test, l0.points[0].x, n0.x, 1e-3, 'l0 x0')
  assertAlmostEqual(test, l0.points[0].y, n0.y + l0.dy / 2, 1e-3, 'l0 y0')
  assertAlmostEqual(test, l0.points[1].x, n4.x, 1e-3, 'l0 x1')
  assertAlmostEqual(test, l0.points[1].y, n4.y + l0.dy / 2, 1e-3, 'l0 y1')

  const n1 = graph.nodes[1]
  const l1 = graph.links[1]
  assertAlmostEqual(test, l1.points[0].x, n1.x, 1e-3, 'l1 x0')
  assertAlmostEqual(test, l1.points[0].y, n1.y + l1.dy / 2, 1e-3, 'l1 y0')
  assertAlmostEqual(test, l1.points[1].x, n4.x, 1e-3, 'l1 x1')
  assertAlmostEqual(test, l1.points[1].y, n4.y + l0.dy + l1.dy / 2, 1e-3, 'l1 y1')

  test.end()
})

tape('sankey() sets link.points on long links', test => {
  //
  // a -- b -- c -- d
  //  `---*----*---`
  //
  const graph = {
    nodes: [
      {id: 'a'},
      {id: 'b'},
      {id: 'c'},
      {id: 'd'}
    ],
    links: [
      {source: 'a', target: 'b', value: 1},
      {source: 'b', target: 'c', value: 1},
      {source: 'c', target: 'd', value: 1},
      {source: 'a', target: 'd', value: 1}
    ]
  }
  sankey().size([3, 4])(graph)

  test.deepEqual(graph.links.map(l => l.dy), [ 1, 1, 1, 1 ])
  test.deepEqual(graph.links[0].points, [
    { x: 0, y: 1.5, ro: 0.5 },
    { x: 1, y: 0.9, ri: 0.5 }
  ])
  test.deepEqual(graph.links[3].points, [
    { x: 0, y: 2.5, ro: 0.5 },
    { x: 1, y: 3.1, ri: 0.5, ro: Infinity },
    { x: 2, y: 3.1, ri: Infinity, ro: 0.5 },
    { x: 3, y: 2.5, ri: 0.5 }
  ])
  test.end()
})

tape('sankey() horizontal positioning', test => {
  function nodeX (width) {
    const graph = {
      nodes: [{id: '0'}, {id: '1'}, {id: '2'}],
      links: [
        {source: '0', target: '1', value: 3},
        {source: '1', target: '2', value: 3}
      ]
    }
    sankey().ordering([['0'], ['1'], ['2']]).size([width, 1])(graph)
    return graph.nodes.map(d => d.x)
  }

  test.deepEqual(nodeX(6), [0, 3, 6], 'equal when straight')
  // test.deepEqual(nodeX([6, 0]), [0, 8, 10], 'min width moves x position');
  // test.deepEqual(nodeX([6, 2]), [0, 7, 10], 'min width moves x position 2');
  // test.deepEqual(nodeX([7, 5]), [0, 10*7/12, 10], 'width allocated fairly if insufficient');
  test.end()
})

function nodeAttr (graph, f) {
  const r = graph.nodes.map(d => [d.id, f(d)])
  r.sort((a, b) => a[0].localeCompare(b[0]))
  return r.map(d => d[1])
}

tape('sankey() nodes with zero value are ignored', test => {
  const graph = {
    nodes: [
      {id: '0'},
      {id: '1'},
      {id: '2'},
      {id: '3'},
      {id: '4'}
    ],
    links: [
      {source: '0', target: '4', value: 5},
      {source: '1', target: '4', value: 5},
      {source: '2', target: '4', value: 0},  // NB value = 0
      {source: '3', target: '4', value: 5}
    ]
  }

  sankey().ordering([['0', '1', '2', '3'], ['4']])(graph)

  const y = nodeAttr(graph, d => d.y)

  const sep01 = y[1] - y[0]
  const sep13 = y[3] - y[1]

  test.equal(nodeAttr(graph, d => d.dy)[2], 0, 'node 2 should have no height')
  assertAlmostEqual(test, sep01, sep13, 1e-6, 'node 2 should not affect spacing of others')
  test.end()
})

tape('justifiedPositioning: bands', test => {
  // 0 -- 2         : band x
  //
  //      1 -- 3    : band y
  //        `- 4    :
  //
  const graph = {
    nodes: [
      {id: '0'},
      {id: '1'},
      {id: '2'},
      {id: '3'},
      {id: '4'}
    ],
    links: [
      {source: '0', target: '2', value: 5},
      {source: '1', target: '3', value: 10},
      {source: '1', target: '4', value: 15}
    ]
  }

  const s = sankey()
        .size([1, 8])
        .ordering([ [['0'], []], [['2'], ['1']], [[], ['3', '4']] ])

  const nodes = nodeAttr(s(graph), d => d)

  // 50% whitespace: scale = 8 / 20 * 0.5 = 0.2
  const margin = (5 / 30) * 8 / 5

  // Bands should not overlap
  const yb = margin + nodes[0].dy + margin
  test.ok(nodes[0].y >= margin, 'node 0 >= margin')
  test.ok(nodes[2].y >= margin, 'node 2 >= margin')
  test.ok(nodes[0].y + nodes[0].dy < yb, 'node 0 above boundary')
  test.ok(nodes[2].y + nodes[2].dy < yb, 'node 2 above boundary')

  test.ok(nodes[1].y > yb, 'node 1 below boundary')
  test.ok(nodes[3].y > yb, 'node 3 below boundary')
  test.ok(nodes[4].y > yb, 'node 4 below boundary')
  test.ok(nodes[1].y + nodes[1].dy <= 8, 'node 1 within height')
  test.ok(nodes[3].y + nodes[3].dy <= 8, 'node 3 within height')
  test.ok(nodes[4].y + nodes[4].dy <= 8, 'node 4 within height')

  test.end()
})

function example4to1 () {
  // 0|---\
  //       \
  // 1|-\   -|
  //     \---|4
  // 2|------|
  //       ,-|
  // 3|---/
  //
  return {
    graph: {
      nodes: [
        {id: '0'},
        {id: '1'},
        {id: '2'},
        {id: '3'},
        {id: '4'}
      ],
      links: [
        {source: '0', target: '4', value: 5},
        {source: '1', target: '4', value: 5},
        {source: '2', target: '4', value: 5},
        {source: '3', target: '4', value: 5}
      ]
    },
    ordering: [['0', '1', '2', '3'], ['4']]
  }
}

tape('sankey.ordering(order) sets rank, band and depth', test => {
  function resultForOrder (order) {
    var graph = {
      nodes: [
        {id: 'a'},
        {id: 'b'},
        {id: 'c'},
        {id: 'd'}
      ],
      links: [
        {source: 'a', target: 'b'},
        {source: 'a', target: 'c'},
        {source: 'c', target: 'd'}
      ]
    }
    return rankBandAndDepth(sankey().ordering(order)(graph))
  }

  test.deepEqual(resultForOrder([['a'], ['b', 'c'], ['d']]), {
    a: [0, undefined, 0],
    b: [1, undefined, 0],
    c: [1, undefined, 1],
    d: [2, undefined, 0]
  }, '2-level order')

  test.deepEqual(resultForOrder([[['a'], []], [['b', 'c'], []], [[], ['d']]]), {
    a: [0, 0, 0],
    b: [1, 0, 0],
    c: [1, 0, 1],
    d: [2, 1, 0]
  }, '3-level order')

  test.end()
})

tape('sankey.ordering() returns ordering', test => {
  var order = [['a'], ['b', 'c'], ['d']]
  test.equal(sankey().ordering(order).ordering(), order)
  test.end()
})

function rankBandAndDepth (G) {
  const r = {}
  G.nodes.forEach(d => {
    r[d.id] = [d.rank, d.band, d.depth]
  })
  return r
}
