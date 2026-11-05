import type { CollectionConfig } from 'payload';

import { adminOnly } from '@/access/adminOnly';
import { anyOf } from '@/access/anyOf';
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess';
import { publicAccess } from '@/access/publicAccess'; // @feature shop
import { adminOrSelf } from '@/access/adminOrSelf';
import { checkRole } from '@/access/utilities';

import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin';

export const Users: CollectionConfig = {
	slug: 'users',
	access: {
		admin: ({ req: { user } }) => checkRole(['admin'], user),
		// Anyone may sign up when there is a shop (customer accounts); otherwise
		// only an admin adds users. The first user registers through /admin.
		create: anyOf(
			adminOnly,
			publicAccess // @feature shop
		),
		delete: adminOnly,
		read: adminOrSelf,
		unlock: adminOnly,
		update: adminOrSelf
	},
	admin: {
		group: 'Users',
		defaultColumns: ['name', 'email', 'roles'],
		useAsTitle: 'name'
	},
	auth: {
		tokenExpiration: 1209600
	},
	fields: [
		{
			name: 'name',
			type: 'text'
		},
		{
			name: 'roles',
			type: 'select',
			access: {
				create: adminOnlyFieldAccess,
				read: adminOnlyFieldAccess,
				update: adminOnlyFieldAccess
			},
			defaultValue: ['customer'],
			hasMany: true,
			hooks: {
				beforeChange: [ensureFirstUserIsAdmin]
			},
			options: [
				{
					label: 'admin',
					value: 'admin'
				},
				{
					label: 'customer',
					value: 'customer'
				}
			]
		},
		// @feature:start shop
		{
			name: 'orders',
			type: 'join',
			collection: 'orders',
			on: 'customer',
			admin: {
				allowCreate: false,
				defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items']
			}
		},
		{
			name: 'cart',
			type: 'join',
			collection: 'carts',
			on: 'customer',
			admin: {
				allowCreate: false,
				defaultColumns: ['id', 'createdAt', 'total', 'currency', 'items']
			}
		},
		{
			name: 'addresses',
			type: 'join',
			collection: 'addresses',
			on: 'customer',
			admin: {
				allowCreate: false,
				defaultColumns: ['id']
			}
		}
		// @feature:end
	]
};
