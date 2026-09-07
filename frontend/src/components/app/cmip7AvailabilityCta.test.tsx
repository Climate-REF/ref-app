import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CMIP7_AVAILABILITY_URL,
  Cmip7AvailabilityCta,
} from "./cmip7AvailabilityCta";

const VARIANTS = ["card", "inline"] as const;

const renderCta = async (variant: (typeof VARIANTS)[number]) => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <Cmip7AvailabilityCta variant={variant} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText(/first CMIP7 AFT models are being published/i);
};

describe("Cmip7AvailabilityCta", () => {
  for (const variant of VARIANTS) {
    it(`leads the ${variant} variant with the CMIP7 diagnostics`, async () => {
      await renderCta(variant);
      const link = screen.getByRole("link", {
        name: /view CMIP7 diagnostics/i,
      });
      expect(link).toHaveAttribute("href", "/diagnostics?mip_era=CMIP7");
    });

    it(`opens the availability dashboard from the ${variant} variant in a new tab`, async () => {
      await renderCta(variant);
      const link = screen.getByRole("link", {
        name: /which models are available/i,
      });
      expect(link).toHaveAttribute("href", CMIP7_AVAILABILITY_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  }
});
