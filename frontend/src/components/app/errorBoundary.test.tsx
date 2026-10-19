import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary, type FallbackProps } from "./errorBoundary";

/** Throws while `broken.current` is true */
function Flaky({ broken }: { broken: { current: boolean } }) {
  if (broken.current) {
    throw new Error("Broken");
  }
  return <p>Working</p>;
}

const fallback = ({ error, reset }: FallbackProps) => (
  <button type="button" onClick={reset}>
    Try again after {error?.message}
  </button>
);

function renderBoundary(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrap = (node: React.ReactNode) => (
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
  );
  const result = render(wrap(ui));
  return {
    ...result,
    rerender: (next: React.ReactNode) => result.rerender(wrap(next)),
  };
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // React logs every caught error; keep the test output readable
  const silenceErrors = () =>
    vi.spyOn(console, "error").mockImplementation(() => {});

  it("renders the children again when the fallback resets", () => {
    silenceErrors();
    const broken = { current: true };
    renderBoundary(
      <ErrorBoundary fallback={fallback}>
        <Flaky broken={broken} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Try again after Broken")).toBeInTheDocument();

    broken.current = false;
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Working")).toBeInTheDocument();
  });

  it("clears the error when a reset key changes", () => {
    silenceErrors();
    const broken = { current: true };
    const { rerender } = renderBoundary(
      <ErrorBoundary fallback={fallback} resetKeys={["/a"]}>
        <Flaky broken={broken} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    broken.current = false;
    rerender(
      <ErrorBoundary fallback={fallback} resetKeys={["/b"]}>
        <Flaky broken={broken} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Working")).toBeInTheDocument();
  });

  it("keeps showing the fallback while the reset keys stay the same", () => {
    silenceErrors();
    const broken = { current: true };
    const { rerender } = renderBoundary(
      <ErrorBoundary fallback={fallback} resetKeys={["/a"]}>
        <Flaky broken={broken} />
      </ErrorBoundary>,
    );
    broken.current = false;
    rerender(
      <ErrorBoundary fallback={fallback} resetKeys={["/a"]}>
        <Flaky broken={broken} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("fetches a failed query again when the fallback resets", async () => {
    silenceErrors();
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValue("Loaded");
    function Data() {
      const { data } = useSuspenseQuery({ queryKey: ["data"], queryFn });
      return <p>{data}</p>;
    }
    renderBoundary(
      <ErrorBoundary fallback={fallback}>
        <Suspense fallback={<p>Loading</p>}>
          <Data />
        </Suspense>
      </ErrorBoundary>,
    );
    fireEvent.click(await screen.findByText("Try again after Offline"));
    expect(await screen.findByText("Loaded")).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
