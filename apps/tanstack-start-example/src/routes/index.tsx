import { Link, createFileRoute } from "@tanstack/react-router";

const featureCards = [
  {
    to: "/default-values",
    title: "defaultValues",
    body: "Insert documents without status or timestamps and confirm the defaults land in Convex.",
  },
  {
    to: "/unique-column",
    title: "uniqueColumn",
    body: "Create records with unique emails and confirm duplicates are rejected.",
  },
  {
    to: "/unique-row",
    title: "uniqueRow",
    body: "Test composite uniqueness with the same slug across different teams.",
  },
  {
    to: "/protected-columns",
    title: "protectedColumns",
    body: "Show safe patch filtering versus dangerous patch overrides on the same table.",
  },
] as const;

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <section className="card">
        <h2>What this app covers</h2>
        <ul className="checklist">
          <li>Each built-in has its own dedicated table and route.</li>
          <li>The routes exercise real Convex mutations and queries, not mock data.</li>
          <li>The pages are meant for manual package verification while iterating on types and runtime behavior.</li>
        </ul>
      </section>

      <section className="feature-grid">
        {featureCards.map((card) => (
          <Link key={card.to} className="feature-card" to={card.to}>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
            <span>Open page</span>
          </Link>
        ))}
      </section>
    </>
  );
}
