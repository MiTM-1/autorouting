import { expect, test } from "bun:test"
import { MultilayerIjump } from "../MultilayerIjump"

const obstacle = {
  type: "rect",
  center: { x: 1, y: 0 },
  width: 2,
  height: 2,
  connectedTo: [],
}

const input = {
  layerCount: 2,
  obstacles: [],
  connections: [],
  minTraceWidth: 0.1,
} as any

const pointToSvg = (point: { x: number; y: number }) => ({
  x: 100 + point.x * 20,
  y: 130 - point.y * 20,
})

function renderNeighborDebugSvg({
  node,
  goal,
  neighbors,
}: {
  node: { x: number; y: number }
  goal: { x: number; y: number }
  neighbors: Array<{ x: number; y: number }>
}) {
  const nodeSvg = pointToSvg(node)
  const goalSvg = pointToSvg(goal)
  const goalDy = goal.y - node.y

  const lines = neighbors
    .map((neighbor) => {
      const neighborSvg = pointToSvg(neighbor)
      const neighborDy = neighbor.y - node.y
      const isWildJump =
        Math.sign(neighborDy) !== Math.sign(goalDy) &&
        Math.abs(neighborDy) === Math.abs(goalDy)

      return `<line x1="${nodeSvg.x}" y1="${nodeSvg.y}" x2="${neighborSvg.x}" y2="${neighborSvg.y}" stroke="${isWildJump ? "#d00" : "#555"}" stroke-width="3" data-kind="${isWildJump ? "wild-jump" : "neighbor"}" />`
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><rect width="260" height="260" fill="#fff"/><circle id="current-node" cx="${nodeSvg.x}" cy="${nodeSvg.y}" r="6" fill="#111"/><circle id="goal" cx="${goalSvg.x}" cy="${goalSvg.y}" r="6" fill="#0a0"/>${lines}</svg>`
}

test("issue #92: obstacle turn creates a wild jump away from the goal", () => {
  const goal = { x: 5, y: -4 }
  const parent = {
    x: 0,
    y: 0,
    l: 0,
    g: 0,
    h: 0,
    obstacleHit: obstacle,
  }
  const node = {
    x: 1,
    y: 0,
    l: 0,
    g: 0,
    h: 0,
    parent,
    obstacleHit: obstacle,
  }

  const autorouter = new MultilayerIjump({
    input,
    startNode: parent as any,
    goalPoint: goal,
  })

  autorouter.allowLayerChange = false
  autorouter.obstacles = {
    getOrthoDirectionCollisionInfo: (_node: unknown, dir: any) => ({
      ...dir,
      wallDistance: Infinity,
      obstacle: null,
    }),
    getObstacleAt: () => obstacle,
  } as any

  const neighbors = autorouter.getNeighbors(node as any)

  // The +Y branch has no wall and the goal is in -Y. The current implementation
  // incorrectly reuses the absolute goal-axis distance in +Y, creating (1, 4),
  // a long jump in exactly the opposite direction from the goal.
  const wildJump = neighbors.filter(
    (neighbor) => neighbor.x === 1 && neighbor.y === 4 && neighbor.l === 0,
  )

  expect(wildJump).toHaveLength(1)

  expect(
    renderNeighborDebugSvg({ node, goal, neighbors }),
  ).toMatchSvgSnapshot(import.meta.path)
})
