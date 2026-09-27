import { useState } from 'react';
import { Form, Formik } from 'formik';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { getSafeRedirect } from '@acme/auth';
import { AuthLayout } from '@acme/layouts';
import { Alert, FormField } from '@acme/ui';
import { AuthCard } from '../components/auth-card';
import { CheckboxField } from '../components/checkbox-field';
import { GoogleButton } from '../components/google-button';
import { OrDivider } from '../components/or-divider';
import { PasswordField } from '../components/password-field';
import { SubmitButton } from '../components/submit-button';
import { signInWithGoogle, signupWithEmail } from '../lib/auth-actions';
import { APP_URL, AUTH_URL, LANDING_URL } from '../lib/env';
import { withRedirect } from '../lib/redirect';
import { signupSchema } from '../lib/schemas';

/**
 * Terms and Privacy are on the marketing site, so these are absolute and open in
 * a new tab — a same-tab navigation across origins would discard a half-filled
 * signup form, and asking someone to re-enter it to read what they are agreeing
 * to is how consent gets clicked through unread.
 */
const legalLinkClass = 'font-semibold text-ink-deep underline underline-offset-2';

function TermsLabel() {
	return (
		<>
			I agree to the{' '}
			<a href={`${LANDING_URL}/terms`} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
				Terms of Service
			</a>{' '}
			and{' '}
			<a href={`${LANDING_URL}/privacy`} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
				Privacy Policy
			</a>
			.
		</>
	);
}

export function SignupRoute() {
	const [params] = useSearchParams();
	const redirect = params.get('redirect');
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	return (
		<AuthLayout>
			<AuthCard
				title="Create your free account"
				description="No fees, no card — get started in a minute."
				footer={
					<>
						Already have an account?{' '}
						<Link to={withRedirect('/login', redirect)} className="font-semibold text-ink-deep">
							Log in
						</Link>
					</>
				}
			>
				{error ? (
					<Alert variant="destructive" className="mb-4">
						{error}
					</Alert>
				) : null}
				<Formik
					initialValues={{ name: '', email: '', password: '', acceptedTerms: false }}
					validationSchema={toFormikValidationSchema(signupSchema)}
					onSubmit={async ({ name, email, password }, helpers) => {
						setError(null);
						const { error: err } = await signupWithEmail({
							name,
							email,
							password,
							callbackURL: `${AUTH_URL}/verified`
						});
						helpers.setSubmitting(false);
						if (err) {
							setError(err);
							return;
						}
						navigate(withRedirect(`/verify-email?email=${encodeURIComponent(email)}`, redirect));
					}}
				>
					{({ isSubmitting, values }) => (
						<Form className="flex flex-col gap-4">
							<FormField name="name" label="Full name" placeholder="Ama Mensah" autoComplete="name" />
							<FormField name="email" label="Email" type="email" placeholder="ama@example.com" autoComplete="email" />
							<PasswordField
								name="password"
								label="Password"
								placeholder="At least 8 characters"
								autoComplete="new-password"
								showStrength
							/>
							<CheckboxField name="acceptedTerms" label={<TermsLabel />} />
							<SubmitButton loading={isSubmitting}>Create account</SubmitButton>
							<OrDivider />
							{/* Google is a second route to the same account, so the same gate applies —
								    otherwise the consent is one click away from being skipped entirely. */}
							<GoogleButton
								onClick={() =>
									void signInWithGoogle({
										callbackURL: getSafeRedirect(redirect, APP_URL)
									})
								}
								disabled={isSubmitting || !values.acceptedTerms}
							/>
						</Form>
					)}
				</Formik>
			</AuthCard>
		</AuthLayout>
	);
}
