import { postgresAdapter } from '@payloadcms/db-postgres';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

import {
	BoldFeature,
	EXPERIMENTAL_TableFeature,
	IndentFeature,
	ItalicFeature,
	LinkFeature,
	OrderedListFeature,
	UnderlineFeature,
	UnorderedListFeature,
	lexicalEditor
} from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

import { Categories } from '@/collections/Categories'; // @feature shop
import { Media } from '@/collections/Media';
import { Pages } from '@/collections/Pages';
import { Users } from '@/collections/Users';
import { health } from '@/endpoints/health';
import { Footer } from '@/globals/Footer';
import { Header } from '@/globals/Header';
import { ShopSettings } from '@/globals/ShopSettings'; // @feature shop
import { migrations } from './migrations';
import { plugins } from './plugins';
import { mailTransport } from './utilities/mailTransport';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
	admin: {
		components: {
			// The `BeforeLogin` component renders a message that you see while logging into your admin panel.
			// Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
			beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
			// The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
			// Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
			beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard']
		},
		user: Users.slug
	},
	collections: [
		Users,
		Pages,
		Categories, // @feature shop
		Media
	],
	db: postgresAdapter({
		pool: { connectionString: process.env.DATABASE_URL || '' },
		// Dev pushes schema changes straight to the database; anything that runs
		// with NODE_ENV=production runs pending migrations at startup instead.
		push: process.env.NODE_ENV !== 'production',
		migrationDir: path.resolve(dirname, 'migrations'),
		prodMigrations: migrations
	}),
	editor: lexicalEditor({
		features: () => {
			return [
				UnderlineFeature(),
				BoldFeature(),
				ItalicFeature(),
				OrderedListFeature(),
				UnorderedListFeature(),
				LinkFeature({
					enabledCollections: ['pages'],
					fields: ({ defaultFields }) => {
						const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
							if ('name' in field && field.name === 'url') return false;
							return true;
						});

						return [
							...defaultFieldsWithoutUrl,
							{
								name: 'url',
								type: 'text',
								admin: {
									condition: ({ linkType }) => linkType !== 'internal'
								},
								label: ({ t }) => t('fields:enterURL'),
								required: true
							}
						];
					}
				}),
				IndentFeature(),
				EXPERIMENTAL_TableFeature()
			];
		}
	}),
	email: nodemailerAdapter({
		defaultFromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@example.com',
		defaultFromName: process.env.MAIL_FROM_NAME || 'Acme Corp',
		transport: mailTransport(),
		// Check the SMTP server at boot in production only: in development it is
		// Mailpit, often not started yet, and type generation boots Payload too.
		skipVerify: !process.env.SMTP_HOST || process.env.NODE_ENV !== 'production'
	}),
	endpoints: [health],
	globals: [
		Header,
		Footer,
		ShopSettings // @feature shop
	],
	plugins,
	secret: process.env.PAYLOAD_SECRET || '',
	typescript: {
		outputFile: path.resolve(dirname, 'payload-types.ts')
	},
	sharp
});
