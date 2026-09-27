import { createBrowserRouter, Navigate } from 'react-router';
import { NotFound } from '@acme/layouts';
import { ForgotPasswordRoute } from '../routes/forgot-password';
import { LoginRoute } from '../routes/login';
import { ResetPasswordRoute } from '../routes/reset-password';
import { SignupRoute } from '../routes/signup';
import { VerifiedRoute } from '../routes/verified';
import { VerifyEmailRoute } from '../routes/verify-email';

export const router = createBrowserRouter([
	{ path: '/', element: <Navigate to="/login" replace /> },
	{ path: '/login', element: <LoginRoute /> },
	{ path: '/signup', element: <SignupRoute /> },
	{ path: '/forgot-password', element: <ForgotPasswordRoute /> },
	{ path: '/reset-password', element: <ResetPasswordRoute /> },
	{ path: '/verify-email', element: <VerifyEmailRoute /> },
	{ path: '/verified', element: <VerifiedRoute /> },
	{ path: '*', element: <NotFound /> }
]);
