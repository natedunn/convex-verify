import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

type UniquePairEntry = {
  _id: string;
  title: string;
  slug: string;
  teamSlug: string;
};

export const Route = createFileRoute("/unique-row")({
  component: UniqueRowPage,
});

function UniqueRowPage() {
  const entries = (useQuery(api.featureDemos.listUniquePairEntries, {}) ?? []) as UniquePairEntry[];
  const createEntry = useMutation(api.featureDemos.createUniquePairEntry);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await createEntry({ title, slug, teamSlug });
      setTitle("");
      setSlug("");
      setTeamSlug("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Insert failed");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <section className="card">
        <h2>uniqueRow</h2>
        <p className="muted">
          The composite index is <code>teamSlug + slug</code>. The same slug is fine across teams,
          but the same combination should be rejected.
        </p>
        <p className="muted">
          Note: we are using an <code>extension</code> to trim and lowercase both slug fields
          before checking uniqueness. This is not built in by default. That means values like{" "}
          <code>{" Core "}</code> and <code>core</code> are treated as the same team slug, and{" "}
          <code>{" Launch "}</code> and <code>launch</code> are treated as the same entry slug.
          Check code in <code>convex/verify.ts</code> to see how this is implemented.
        </p>
      </section>

      <section className="card">
        <h2>Create unique pair entry</h2>
        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Launch notes"
              required
            />
          </label>

          <div className="form-split">
            <label className="field">
              <span>Team slug</span>
              <input
                value={teamSlug}
                onChange={(event) => setTeamSlug(event.target.value)}
                placeholder="core"
                required
              />
            </label>

            <label className="field">
              <span>Entry slug</span>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="launch"
                required
              />
            </label>
          </div>

          <div className="actions">
            <button className="button" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Checking..." : "Create row"}
            </button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Stored rows</h2>
        {entries.length === 0 ? (
          <p className="muted">No rows yet.</p>
        ) : (
          <div className="stack-list">
            {entries.map((entry) => (
              <article key={entry._id} className="entity-row">
                <div>
                  <strong>{entry.title}</strong>
                  <p className="muted">
                    {entry.teamSlug} / {entry.slug}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
