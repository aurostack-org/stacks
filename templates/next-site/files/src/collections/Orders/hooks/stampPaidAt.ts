import type { CollectionBeforeChangeHook } from 'payload';

/** Records when an order became paid, and clears it if that is undone. */
export const stampPaidAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
	const wasPaid = originalDoc?.paymentStatus === 'paid';
	const isPaid = (data.paymentStatus ?? originalDoc?.paymentStatus) === 'paid';

	if (isPaid && !wasPaid) data.paidAt = new Date().toISOString();
	if (!isPaid && data.paymentStatus) data.paidAt = null;

	return data;
};
