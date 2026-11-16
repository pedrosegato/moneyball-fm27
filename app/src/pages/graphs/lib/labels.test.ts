import { labeledPoints, placeLabels, quadrantCaptions } from "./labels";
import { pointSet } from "./scatter";

describe("labeled points", () => {
  it("labels the top N by z(x) + z(y), best first, and never more than are plotted", () => {
    const points = pointSet(5, {}, [1, 5, 3, 4, 2], [1, 5, 3, 2, 4]);
    expect(labeledPoints(points, 3, true, true)).toEqual([1, 2, 3]);
    expect(labeledPoints(points, 10, true, true)).toHaveLength(5);
    expect(labeledPoints(pointSet(0, {}, [], []), 10, true, true)).toEqual([]);
  });
});

describe("quadrant captions", () => {
  it("say in plain words what each corner means against the averages", () => {
    expect(quadrantCaptions("Drb/90", "xA/90")).toEqual({
      topRight: "Melhor que a média nos dois",
      topLeft: "Melhor que a média só em xA/90",
      bottomRight: "Melhor que a média só em Drb/90",
      bottomLeft: "Pior que a média nos dois",
    });
    expect(quadrantCaptions("Drb/90", "xA/90", true)).toEqual({
      topRight: "Melhor nos dois",
      topLeft: "Melhor em xA/90",
      bottomRight: "Melhor em Drb/90",
      bottomLeft: "Pior nos dois",
    });
  });
});

describe("label placement", () => {
  it("keeps labels of neighbouring points apart and inside the plot", () => {
    const size = { width: 400, height: 300 };
    const boxes = placeLabels(
      [
        { x: 100, y: 100, width: 60 },
        { x: 104, y: 101, width: 60 },
        { x: 396, y: 150, width: 60 },
      ],
      size,
      14,
    );
    expect(boxes.every((b) => b !== null)).toBe(true);
    const [a, b, edge] = boxes as NonNullable<(typeof boxes)[number]>[];
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + 14 && b.y < a.y + 14;
    expect(overlap).toBe(false);
    expect(edge.x + edge.width).toBeLessThanOrEqual(size.width);
  });

  it("moves a label off whatever is in the way, and drops it when nothing is free", () => {
    const size = { width: 400, height: 300 };
    const dot = { x: 120, y: 93, width: 12 };
    const [moved] = placeLabels([{ x: 100, y: 100, width: 60 }], size, 14, [dot]);
    expect(moved).not.toBeNull();
    expect(
      moved!.x >= dot.x + dot.width ||
        dot.x >= moved!.x + moved!.width ||
        moved!.y >= dot.y + 14 ||
        dot.y >= moved!.y + 14,
    ).toBe(true);
    const [dropped] = placeLabels([{ x: 100, y: 100, width: 60 }], size, 14, [
      { x: 0, y: 0, width: 400 },
      ...Array.from({ length: 30 }, (_, k) => ({ x: 0, y: k * 10, width: 400 })),
    ]);
    expect(dropped).toBeNull();
  });
});
