import { makeStore } from '@inerds/api';
import { authReducer } from '@inerds/auth';
import { useDispatch, useSelector } from 'react-redux';

// `auth` holds the Better Auth session so the header can swap its CTAs for a
// signed-in visitor. Landing still has no protected routes and no guards — it
// reads the session purely to render, and every page stays fully public.
export const store = makeStore({
	reducer: {
		auth: authReducer
	}
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
