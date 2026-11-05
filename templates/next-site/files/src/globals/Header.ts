import type { GlobalConfig } from 'payload';

import { adminOnly } from '@/access/adminOnly';
import { link } from '@/fields/link';

export const Header: GlobalConfig = {
	slug: 'header',
	access: {
		read: () => true,
		update: adminOnly
	},
	fields: [
		{
			name: 'logo',
			type: 'upload',
			relationTo: 'media',
			admin: {
				description: 'Shown in the header and footer. Without one, the site name is shown in text.'
			}
		},
		{
			name: 'navItems',
			type: 'array',
			fields: [
				link({
					appearances: false
				})
			],
			maxRows: 6
		}
	]
};
