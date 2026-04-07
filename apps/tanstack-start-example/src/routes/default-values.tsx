import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

type DefaultProfile = {
  _id: string;
  label: string;
  status: string;
  createdAt: number;
};

export const Route = createFileRoute("/default-values")({
  component: DefaultValuesPage,
});

function DefaultValuesPage() {
  const profiles = (useQuery(api.featureDemos.listDefaultProfiles, {}) ?? []) as DefaultProfile[];
  const createProfile = useMutation(api.featureDemos.createDefaultProfile);
  const previewProfile = useMutation(api.featureDemos.previewDefaultProfile);

  const [label, setLabel] = useState("");
  const [preview, setPreview] = useState<DefaultProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "previewing" | "saving">("idle");

  const handlePreview = async () => {
    setStatus("previewing");
    setError(null);

    try {
      const result = (await previewProfile({ label })) as DefaultProfile;
      setPreview(result);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed");
    } finally {
      setStatus("idle");
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    try {
      await createProfile({ label });
      setLabel("");
      setPreview(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Insert failed");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <section className="card">
        <h2>defaultValues</h2>
        <p className="muted">
          This table only accepts <code>label</code> from the form. The mutation omits{" "}
          <code>status</code> and <code>createdAt</code>, so the page proves the defaults are being
          filled inside <code>verifyConfig</code>.
        </p>
      </section>

      <section className="card">
        <h2>Create profile</h2>
        <form className="form" onSubmit={(event) => void handleCreate(event)}>
          <label className="field">
            <span>Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Launch checklist"
              required
            />
          </label>

          <div className="actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={!label || status !== "idle"}
              onClick={() => void handlePreview()}
            >
              Preview defaults
            </button>
            <button className="button" type="submit" disabled={!label || status !== "idle"}>
              {status === "saving" ? "Saving..." : "Insert with defaults"}
            </button>
          </div>
        </form>

        {preview ? (
          <pre className="preview-block">{JSON.stringify(preview, null, 2)}</pre>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Stored rows</h2>
        {profiles.length === 0 ? (
          <p className="muted">No rows yet.</p>
        ) : (
          <div className="stack-list">
            {profiles.map((profile) => (
              <article key={profile._id} className="entity-row">
                <div>
                  <strong>{profile.label}</strong>
                  <p className="muted">status: {profile.status}</p>
                </div>
                <span className="badge">{new Date(profile.createdAt).toLocaleString()}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
