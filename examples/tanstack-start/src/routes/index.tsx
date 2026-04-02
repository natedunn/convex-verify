import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type DemoUser = {
  _id: string;
  email: string;
  name: string;
  status: string;
  createdAt: number;
};

function HomePage() {
  const listUsersRef = (api as any).users.listUsers;
  const createUserRef = (api as any).users.createUser;
  const users = (useQuery(listUsersRef, {}) ?? []) as DemoUser[];
  const createUser = useMutation(createUserRef);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await createUser({
        email,
        name,
      });
      setEmail("");
      setName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not create user",
      );
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <section className="card">
        <h2>What this proves</h2>
        <ul className="checklist">
          <li>The app imports `convex-verify` by package name, not by relative path.</li>
          <li>Email addresses are normalized before uniqueness checks run.</li>
          <li>Default values are added by `verifyConfig` inside a real Convex mutation.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Create user</h2>
        <p className="muted">
          Try creating `ALICE@EXAMPLE.COM`, then try `alice@example.com` again.
          The second insert should fail because the normalization plugin runs
          before the unique email check.
        </p>

        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alice"
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ALICE@EXAMPLE.COM"
              required
            />
          </label>

          <div className="actions">
            <button className="button" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Users</h2>
        {users.length === 0 ? (
          <p className="muted">No users yet.</p>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <article key={user._id} className="user-row">
                <div>
                  <strong>{user.name}</strong>
                  <p className="muted">{user.email}</p>
                </div>
                <div className="meta">
                  <span>{user.status}</span>
                  <span>{new Date(user.createdAt).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
