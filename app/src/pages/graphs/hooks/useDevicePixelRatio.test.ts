import { act, renderHook } from "@testing-library/react";
import { useDevicePixelRatio } from "./useDevicePixelRatio";

describe("device pixel ratio", () => {
  const ratio = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  const matchMedia = window.matchMedia;
  const setRatio = (value: number) => Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });
  afterEach(() => {
    if (ratio) Object.defineProperty(window, "devicePixelRatio", ratio);
    window.matchMedia = matchMedia;
  });

  it("follows the window to a screen with another ratio, and stops listening when it goes", () => {
    const listening = new Map<string, () => void>();
    window.matchMedia = vi.fn((media: string) => ({
      media,
      addEventListener: (_: string, listener: () => void) => listening.set(media, listener),
      removeEventListener: () => listening.delete(media),
    })) as unknown as typeof window.matchMedia;
    setRatio(1);
    const { result, unmount } = renderHook(() => useDevicePixelRatio());
    expect(result.current).toBe(1);
    expect([...listening.keys()]).toEqual(["(resolution: 1dppx)"]);

    setRatio(2);
    act(() => listening.get("(resolution: 1dppx)")!());
    expect(result.current).toBe(2);
    expect([...listening.keys()]).toEqual(["(resolution: 2dppx)"]);
    unmount();
    expect(listening.size).toBe(0);
  });
});
