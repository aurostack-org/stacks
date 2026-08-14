import { useState } from 'react';
import { Form, Formik } from 'formik';
import { Link, useSearchParams } from 'react-router';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { getSafeRedirect } from '@inerds/auth';
import { AuthLayout } from '@inerds/layouts';
import { Alert, FormField } from '@inerds/ui';
import { AuthCard } from '../components/auth-card';
import { CheckboxField } from '../components/checkbox-field';
import { GoogleButton } from '../components/google-button';
import { OrDivider } from '../components/or-divider';
import { PasswordField } from '../components/password-field';
import { SubmitButton } from '../components/submit-button';
import { loginWithEmail, signInWithGoogle } from '../lib/auth-actions';
import { APP_URL } from '../lib/env';
import { withRedirect } from '../lib/redirect';
import { loginSchema } from '../lib/schemas';

export function LoginRoute() {
	const [params] = useSearchParams();
	const redirect = params.get('redirect');
	const [error, setError] = useState<string | null>(null);
	const target = () => getSafeRedirect(redirect, APP_URL);

	return (
		<AuthLayout>
			<AuthCard
				title="Welcome back"
				description="Log in to pick up where you left off."
				footer={
					<>
						New here?{' '}
						<Link to={withRedirect('/signup', redirect)} className="font-semibold text-ink-deep">
							Create a free account
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
					initialValues={{ email: '', password: '', remember: true }}
					validationSchema={toFormikValidationSchema(loginSchema)}
					onSubmit={async (values, helpers) => {
						setError(null);
						const { error: err } = await loginWithEmail(values);
						helpers.setSubmitting(false);
						if (err) {
							setError(err);
							return;
						}
						window.location.assign(target());
					}}
				>
					{({ isSubmitting }) => (
						<Form className="flex flex-col gap-4">
							<FormField name="email" label="Email" type="email" placeholder="ama@example.com" autoComplete="email" />
							<PasswordField
								name="password"
								label="Password"
								placeholder="Your password"
								autoComplete="current-password"
								action={
									<Link to="/forgot-password" className="text-xs font-semibold text-ink-deep">
										Forgot password?
									</Link>
								}
							/>
							<CheckboxField name="remember" label="Remember me on this device" />
							<SubmitButton loading={isSubmitting}>Log in</SubmitButton>
							<OrDivider />
							<GoogleButton onClick={() => void signInWithGoogle({ callbackURL: target() })} disabled={isSubmitting} />
						</Form>
					)}
				</Formik>
			</AuthCard>
		</AuthLayout>
	);
}
