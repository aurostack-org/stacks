import { OrderStatus as StatusOptions } from '@/payload-types';
import { cn } from '@/utilities/cn';

type Props = {
	status: StatusOptions;
	className?: string;
};

export const OrderStatus: React.FC<Props> = ({ status, className }) => {
	return (
		<div
			className={cn('text-xs tracking-widest font-mono uppercase py-0 px-2 rounded w-fit', className, {
				'bg-muted': status === 'processing',
				'bg-positive': status === 'completed'
			})}
		>
			{status}
		</div>
	);
};
