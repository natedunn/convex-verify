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
            <h1>convex-verify feature lab</h1>
            <p className="lede">
              Dedicated routes for each built-in so you can manually verify runtime behavior while
              iterating on the package.
            </p>
            <nav className="nav">
              <Link to="/">Overview</Link>
              <Link to="/default-values">defaultValues</Link>
              <Link to="/unique-column">uniqueColumn</Link>
              <Link to="/unique-row">uniqueRow</Link>
              <Link to="/protected-columns">protectedColumns</Link>
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
      <p className="muted">Choose one of the built-in demo routes from the header.</p>
      <Link to="/">Go back</Link>
    </section>
  );
}
