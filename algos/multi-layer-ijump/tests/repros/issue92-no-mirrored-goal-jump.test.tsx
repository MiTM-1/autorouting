import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { getSimpleRouteJson } from "solver-utils"
import { MultilayerIjump } from "../../MultilayerIjump"

const Pad = (props: {
  name: string
  pcbX: number
  pcbY: number
  width?: string
  height?: string
}) => (
  <chip name={props.name} pcbX={props.pcbX} pcbY={props.pcbY}>
    <footprint>
      <smtpad
        pcbX={0}
        pcbY={0}
        shape="rect"
        width={props.width ?? "1mm"}
        height={props.height ?? "1mm"}
        layer="top"
        portHints={["pin1"]}
      />
    </footprint>
  </chip>
)

class InspectingMultilayerIjump extends MultilayerIjump {
  mirroredGoalJumps: Array<{
    from: { x: number; y: number }
    to: { x: number; y: number }
  }> = []

  override getNeighbors(node: any) {
    const neighbors = super.getNeighbors(node)
    const goal = this.goalPoint as any
    const epsilon = 1e-6

    for (const neighbor of neighbors) {
      const dx = neighbor.x - node.x
      const dy = neighbor.y - node.y
      const goalDx = goal.x - node.x
      const goalDy = goal.y - node.y

      const mirroredHorizontalJump =
        Math.abs(dy) < epsilon &&
        Math.abs(dx) > epsilon &&
        Math.sign(dx) === -Math.sign(goalDx) &&
        Math.abs(Math.abs(dx) - Math.abs(goalDx)) < epsilon

      const mirroredVerticalJump =
        Math.abs(dx) < epsilon &&
        Math.abs(dy) > epsilon &&
        Math.sign(dy) === -Math.sign(goalDy) &&
        Math.abs(Math.abs(dy) - Math.abs(goalDy)) < epsilon

      if (mirroredHorizontalJump || mirroredVerticalJump) {
        this.mirroredGoalJumps.push({
          from: { x: node.x, y: node.y },
          to: { x: neighbor.x, y: neighbor.y },
        })
      }
    }

    return neighbors
  }
}

test("issue 92: does not jump to the mirrored goal coordinate", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="16mm" height="12mm" routingDisabled>
      <Pad name="U1" pcbX={-6} pcbY={0} />
      <Pad name="U2" pcbX={6} pcbY={4} />
      <Pad name="U_obstacle" pcbX={0} pcbY={0} width="2mm" height="2mm" />
      <trace from=".U1 > .pin1" to=".U2 > .pin1" />
    </board>,
  )

  const input = getSimpleRouteJson(circuit.getCircuitJson(), { layerCount: 2 })
  const autorouter = new InspectingMultilayerIjump({ input, debug: true })
  autorouter.allowLayerChange = false

  const solution = autorouter.solveAndMapToTraces()

  expect(solution).toHaveLength(1)
  expect(autorouter.mirroredGoalJumps).toEqual([])
})
