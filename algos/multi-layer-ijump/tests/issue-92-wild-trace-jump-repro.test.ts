import { expect, test } from "bun:test"
import { MultilayerIjump } from "../MultilayerIjump"

test("issue #92: blocked forward motion can create a wild jump away from the goal", () => {
  // This is a deliberately minimal getNeighbors reproduction of the behavior
  // described in #92. The router arrives at a node after the forward direction
  // was blocked by an obstacle and must choose a perpendicular direction.
  //
  // The negative-Y direction has no wall, while the goal is 100 units in the
  // opposite (+Y) direction. The current implementation still adds a -100
  // candidate because the infinite-wall branch uses goalDistAlongTravelDir
  // without checking that the goal is actually in that travel direction.
  const autorouter = Object.create(MultilayerIjump.prototype) as any

  autorouter.goalPoint = { x: 10, y: 100, l: 0 }
  autorouter.startNode = { x: -10, y: 0, l: 0 }
  autorouter.layerCount = 2
  autorouter.allowLayerChange = false
  autorouter.VIA_DIAMETER = 0.5
  autorouter.OBSTACLE_MARGIN = 0.15
  autorouter.GRID_STEP = 0.1
  autorouter.marginsWithCosts = [
    { margin: 1, enterCost: 0, travelCostFactor: 1 },
    { margin: 0.15, enterCost: 10, travelCostFactor: 2 },
  ]

  const blockingObstacle = {
    type: "rect",
    center: { x: 1, y: 0 },
    width: 1,
    height: 1,
    connectedTo: [],
  }

  autorouter.obstacles = {
    getOrthoDirectionCollisionInfo: (_node: unknown, dir: any) => ({
      ...dir,
      wallDistance: Infinity,
      obstacle: null,
    }),
    getObstaclesOverlappingRegion: () => [],
    getObstacleAt: () => null,
  }

  const parent = {
    x: -1,
    y: 0,
    l: 0,
    obstacleHit: blockingObstacle,
  }
  const node = {
    x: 0,
    y: 0,
    l: 0,
    parent,
    obstacleHit: blockingObstacle,
  }

  const neighbors = autorouter.getNeighbors(node)
  const negativeYDebugSnapshot = neighbors
    .filter((neighbor: any) => neighbor.y < node.y)
    .map((neighbor: any) => ({ x: neighbor.x, y: neighbor.y, l: neighbor.l }))
    .sort((a: any, b: any) => a.y - b.y)

  // Debug snapshot of the bug: the -100 point is a wild jump directly away
  // from a goal at y=+100. The useful obstacle-clearing candidates are the
  // short -1.5 and -0.65 moves.
  expect(negativeYDebugSnapshot).toEqual([
    { x: 0, y: -100, l: 0 },
    { x: 0, y: -1.5, l: 0 },
    { x: 0, y: -0.65, l: 0 },
  ])
})
