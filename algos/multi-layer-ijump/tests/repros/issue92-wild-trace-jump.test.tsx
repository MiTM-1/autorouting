import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { getSimpleRouteJson } from "solver-utils"
import { getDebugSvg } from "../../../infinite-grid-ijump-astar/tests/fixtures/get-debug-svg"
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

test("issue 92: off-axis goal does not need a wild mirrored jump", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="16mm" height="12mm" routingDisabled>
      <Pad name="U1" pcbX={-6} pcbY={0} />
      <Pad name="U2" pcbX={6} pcbY={4} />
      <Pad name="U_obstacle" pcbX={0} pcbY={0} width="2mm" height="2mm" />
      <trace from=".U1 > .pin1" to=".U2 > .pin1" />
    </board>,
  )

  const inputCircuitJson = circuit.getCircuitJson()
  const input = getSimpleRouteJson(inputCircuitJson, { layerCount: 2 })
  const autorouter = new MultilayerIjump({ input, debug: true })

  // Keep this reproduction planar so the intersection-jump behavior is
  // visible without a via providing an alternate escape route.
  autorouter.allowLayerChange = false

  const solution = autorouter.solveAndMapToTraces()

  expect(
    getDebugSvg({ inputCircuitJson, autorouter, solution }),
  ).toMatchSvgSnapshot(import.meta.path)

  expect(solution).toHaveLength(1)
})
