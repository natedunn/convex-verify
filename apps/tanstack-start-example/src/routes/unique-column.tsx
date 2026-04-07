import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

type UniqueEmailUser = {
	_id: string;
	email: string;
	label: string;
};

export const Route = createFileRoute("/unique-column")({
	component: UniqueColumnPage,
});

function UniqueColumnPage() {
	const users = (useQuery(api.featureDemos.listUniqueEmailUsers, {}) ??
		[]) as UniqueEmailUser[];
	const createUser = useMutation(api.featureDemos.createUniqueEmailUser);

	const [email, setEmail] = useState("");
	const [label, setLabel] = useState("");
	const [status, setStatus] = useState<"idle" | "submitting">("idle");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setStatus("submitting");
		setError(null);

		try {
			await createUser({ email, label });
			setEmail("");
			setLabel("");
		} catch (submitError) {
			setError(
				submitError instanceof Error ? submitError.message : "Insert failed",
			);
		} finally {
			setStatus("idle");
		}
	};

	return (
		<>
			<section className="card">
				<h2>uniqueColumn</h2>
				<p className="muted">
					This page checks <code>by_email</code> on a dedicated table. Reuse the
					same email twice and the second mutation should fail.
				</p>
				<p className="muted">
					Note: we are using an <code>extension</code> to normalize emails
					before checking uniqueness. This is not built in by default but this
					now means that <code>alice@example.com</code> and{" "}
					<code>ALICE@EXAMPLE.COM</code> would be considered the same email.
					Check code in <code>convex/verify.ts</code> to see how this is
					implemented.
				</p>
			</section>

			<section className="card">
				<h2>Create unique email user</h2>
				<form className="form" onSubmit={(event) => void handleSubmit(event)}>
					<label className="field">
						<span>Label</span>
						<input
							value={label}
							onChange={(event) => setLabel(event.target.value)}
							placeholder="Primary contact"
							required
						/>
					</label>

					<label className="field">
						<span>Email</span>
						<input
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="alice@example.com"
							required
							type="email"
						/>
					</label>

					<div className="actions">
						<button
							className="button"
							type="submit"
							disabled={status === "submitting"}
						>
							{status === "submitting" ? "Checking..." : "Create row"}
						</button>
					</div>
				</form>

				{error ? <p className="error">{error}</p> : null}
			</section>

			<section className="card">
				<h2>Stored rows</h2>
				{users.length === 0 ? (
					<p className="muted">No rows yet.</p>
				) : (
					<div className="stack-list">
						{users.map((user) => (
							<article key={user._id} className="entity-row">
								<div>
									<strong>{user.label}</strong>
									<p className="muted">{user.email}</p>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</>
	);
}
