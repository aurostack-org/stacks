import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { Plugin } from 'payload';
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types';
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical';
import { ecommercePlugin } from '@payloadcms/plugin-ecommerce'; // @feature shop

import { docPath } from '@/utilities/docPath';
import { getServerSideURL } from '@/utilities/getURL';
import { OrdersCollection } from '@/collections/Orders'; // @feature shop
import { ProductsCollection } from '@/collections/Products'; // @feature shop
import { currenciesConfig } from '@/lib/currency'; // @feature shop
import { paymentMethods } from '@/payments'; // @feature shop
import { ownerRedirects } from '@/redirects/plugin'; // @feature redirects
import { siteSearch } from '@/search/plugin'; // @feature search
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus';
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess';
import { customerOnlyFieldAccess } from '@/access/customerOnlyFieldAccess'; // @feature shop
import { isAdmin } from '@/access/isAdmin';
import { isDocumentOwner } from '@/access/isDocumentOwner'; // @feature shop

/** What the SEO plugin needs from a page or product. */
type SeoDoc = { title?: string | null; slug?: string | null };

const generateTitle: GenerateTitle<SeoDoc> = ({ doc }) => (doc?.title ? `${doc.title} | Acme Corp` : 'Acme Corp');

const generateURL: GenerateURL<SeoDoc> = ({ doc, collectionSlug }) => {
	const url = getServerSideURL();
	return doc?.slug ? `${url}${docPath(collectionSlug || 'pages', doc.slug)}` : url;
};

export const plugins: Plugin[] = [
	seoPlugin({
		generateTitle,
		generateURL
	}),
	formBuilderPlugin({
		fields: {
			payment: false
		},
		formSubmissionOverrides: {
			access: {
				delete: isAdmin,
				read: isAdmin,
				update: isAdmin
			},
			admin: {
				group: 'Content'
			}
		},
		formOverrides: {
			access: {
				delete: isAdmin,
				read: isAdmin,
				update: isAdmin,
				create: isAdmin
			},
			admin: {
				group: 'Content'
			},
			fields: ({ defaultFields }) => {
				return defaultFields.map((field) => {
					if ('name' in field && field.name === 'confirmationMessage') {
						return {
							...field,
							editor: lexicalEditor({
								features: ({ rootFeatures }) => {
									return [
										...rootFeatures,
										FixedToolbarFeature(),
										HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] })
									];
								}
							})
						};
					}
					return field;
				});
			}
		}
	}),
	// @feature:start shop
	ecommercePlugin({
		access: {
			adminOnlyFieldAccess,
			adminOrPublishedStatus,
			customerOnlyFieldAccess,
			isAdmin,
			isDocumentOwner
		},
		currencies: currenciesConfig,
		customers: {
			slug: 'users'
		},
		orders: {
			ordersCollectionOverride: OrdersCollection
		},
		payments: {
			paymentMethods
		},
		products: {
			productsCollectionOverride: ProductsCollection
		}
	}),
	// @feature:end
	// Last: they hook into collections the plugins above create (products).
	ownerRedirects, // @feature redirects
	siteSearch // @feature search
];
