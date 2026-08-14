import { makeStore } from '@inerds/api';
import { authReducer } from '@inerds/auth';
import { useDispatch, useSelector } from 'react-redux';

export const store = makeStore({
	reducer: {
		auth: authReducer
	}
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
