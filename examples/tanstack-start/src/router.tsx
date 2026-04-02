import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";

function createRouterContext() {
  const convex = new ConvexReactClient(
    import.meta.env["VITE_CONVEX_URL"] as string,
  );

  return { convex };
}

export type RouterContext = ReturnType<typeof createRouterContext>;

export function getRouter() {
  const context = createRouterContext();

  return createTanStackRouter({
    routeTree,
    context,
    defaultPreload: false,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
