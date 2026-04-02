import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import type { RouterContext } from "../router";
import "../styles.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "convex-verify TanStack Start example" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });

  return (
    <RootDocument>
      <ConvexProvider client={context.convex}>
        <div className="page-shell">
          <header className="hero">
            <p className="eyebrow">TANSTACK START EXAMPLE</p>
            <h1>convex-verify package check</h1>
            <p className="lede">
              Smallest possible app in this repo that exercises
              <code>convex-verify</code> as a package dependency.
            </p>
            <nav className="nav">
              <Link to="/">Users demo</Link>
            </nav>
          </header>

          <main className="content">
            <Outlet />
          </main>
        </div>
      </ConvexProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <section className="card">
      <h2>Page not found</h2>
      <p className="muted">There is only one route in this example app.</p>
      <Link to="/">Go back</Link>
    </section>
  );
}
