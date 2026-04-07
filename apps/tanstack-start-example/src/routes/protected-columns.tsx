import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type ProtectedDoc = {
  _id: Id<"protectedDocs">;
  title: string;
  ownerId: string;
  body?: string;
};

type SafePatchResult = {
  filtered: {
    title?: string;
    body?: string;
  };
  doc: ProtectedDoc | null;
};

type PatchFeedback =
  | {
      kind: "safe";
      result: SafePatchResult;
    }
  | {
      kind: "dangerous";
    };

export const Route = createFileRoute("/protected-columns")({
  component: ProtectedColumnsPage,
});

function ProtectedColumnsPage() {
  const docs = (useQuery(api.featureDemos.listProtectedDocs, {}) ?? []) as ProtectedDoc[];
  const createDoc = useMutation(api.featureDemos.createProtectedDoc);
  const safePatchDoc = useMutation(api.featureDemos.safePatchProtectedDoc);
  const dangerousPatchDoc = useMutation(api.featureDemos.dangerousPatchProtectedDoc);

  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "creating">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("creating");
    setError(null);

    try {
      await createDoc({
        title,
        ownerId,
        body: body || undefined,
      });
      setTitle("");
      setOwnerId("");
      setBody("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Create failed");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <section className="card">
        <h2>protectedColumns</h2>
        <p className="muted">
          <code>ownerId</code> is protected. Safe patching strips it. Dangerous patching still lets
          you override it when you intentionally want the escape hatch.
        </p>
      </section>

      <section className="card">
        <h2>Create protected doc</h2>
        <form className="form" onSubmit={(event) => void handleCreate(event)}>
          <label className="field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Migration plan"
              required
            />
          </label>

          <div className="form-split">
            <label className="field">
              <span>Owner ID</span>
              <input
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                placeholder="owner-1"
                required
              />
            </label>

            <label className="field">
              <span>Body</span>
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Optional notes"
              />
            </label>
          </div>

          <div className="actions">
            <button className="button" type="submit" disabled={status === "creating"}>
              {status === "creating" ? "Creating..." : "Create doc"}
            </button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Stored docs</h2>
        {docs.length === 0 ? (
          <p className="muted">No docs yet.</p>
        ) : (
          <div className="stack-list">
            {docs.map((doc) => (
              <ProtectedDocEditor
                key={doc._id}
                doc={doc}
                onDangerousPatch={dangerousPatchDoc}
                onError={setError}
                onSafePatch={async (payload) =>
                  (await safePatchDoc(payload)) as SafePatchResult
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ProtectedDocEditor({
  doc,
  onSafePatch,
  onDangerousPatch,
  onError,
}: {
  doc: ProtectedDoc;
  onSafePatch: (payload: {
    id: Id<"protectedDocs">;
    title: string;
    ownerId?: string;
    body?: string;
  }) => Promise<SafePatchResult>;
  onDangerousPatch: (payload: {
    id: Id<"protectedDocs">;
    title: string;
    ownerId?: string;
    body?: string;
  }) => Promise<unknown>;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [ownerId, setOwnerId] = useState(doc.ownerId);
  const [body, setBody] = useState(doc.body ?? "");
  const [status, setStatus] = useState<"idle" | "safe" | "dangerous">("idle");
  const [feedback, setFeedback] = useState<PatchFeedback | null>(null);

  useEffect(() => {
    setTitle(doc.title);
    setOwnerId(doc.ownerId);
    setBody(doc.body ?? "");
  }, [doc]);

  const handleSafePatch = async () => {
    setStatus("safe");
    onError(null);

    try {
      const result = await onSafePatch({
        id: doc._id,
        title,
        ownerId,
        body: body || undefined,
      });
      setFeedback({
        kind: "safe",
        result,
      });
    } catch (patchError) {
      onError(patchError instanceof Error ? patchError.message : "Safe patch failed");
    } finally {
      setStatus("idle");
    }
  };

  const handleDangerousPatch = async () => {
    setStatus("dangerous");
    onError(null);

    try {
      await onDangerousPatch({
        id: doc._id,
        title,
        ownerId,
        body: body || undefined,
      });
      setFeedback({
        kind: "dangerous",
      });
    } catch (patchError) {
      onError(patchError instanceof Error ? patchError.message : "Dangerous patch failed");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <article className="editor-card">
      <div className="editor-header">
        <div>
          <strong>{doc.title}</strong>
          <p className="muted">
            current owner: <code>{doc.ownerId}</code>
          </p>
        </div>
        <span className="badge">{doc._id}</span>
      </div>

      <div className="form-split">
        <label className="field">
          <span>Next title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span>Attempt ownerId change</span>
          <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>Body</span>
        <input value={body} onChange={(event) => setBody(event.target.value)} />
      </label>

      <div className="actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={status !== "idle"}
          onClick={() => void handleSafePatch()}
        >
          {status === "safe" ? "Applying..." : "Safe patch"}
        </button>
        <button
          className="button"
          type="button"
          disabled={status !== "idle"}
          onClick={() => void handleDangerousPatch()}
        >
          {status === "dangerous" ? "Applying..." : "Dangerous patch"}
        </button>
      </div>

      {feedback ? (
        <div className="editor-feedback">
          <strong>
            {feedback.kind === "safe" ? "Last safe patch" : "Last dangerous patch"}
          </strong>
          {feedback.kind === "safe" ? (
            <>
              <p className="muted">
                The patch sent to Convex after protected columns were stripped:
              </p>
              <pre className="preview-block">
                {JSON.stringify(feedback.result.filtered, null, 2)}
              </pre>
            </>
          ) : (
            <p className="muted">
              Dangerous patch bypassed protected-column filtering. The current row above is live
              query data from Convex.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
