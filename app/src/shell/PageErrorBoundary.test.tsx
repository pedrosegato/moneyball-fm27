import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { lazyPage } from "./pages";

function Hello({ name }: { name: string }) {
  return <p>Olá, {name}</p>;
}

describe("PageErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("offers a retry when a page's chunk fails to load, and the retry fetches it again", async () => {
    const load = vi
      .fn<() => Promise<typeof Hello>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValue(Hello);
    const Page = lazyPage(load);
    render(
      <PageErrorBoundary onRetry={() => Page.retry()}>
        <Suspense fallback={<p>carregando</p>}>
          <Page name="Ana" />
        </Suspense>
      </PageErrorBoundary>,
    );

    expect(await screen.findByRole("heading", { name: "Não foi possível abrir esta tela" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Olá, Ana")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps a page that loaded once instead of fetching it again on a retry", async () => {
    const load = vi.fn(async () => Hello);
    const Page = lazyPage(load);
    const { rerender } = render(
      <Suspense fallback={null}>
        <Page name="Ana" />
      </Suspense>,
    );
    await screen.findByText("Olá, Ana");
    Page.retry();
    rerender(
      <Suspense fallback={null}>
        <Page name="Ana" />
      </Suspense>,
    );
    expect(screen.getByText("Olá, Ana")).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
