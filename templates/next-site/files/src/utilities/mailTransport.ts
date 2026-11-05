import nodemailer from 'nodemailer';
import type { Transport } from 'nodemailer';

/**
 * Where Payload's emails go. With SMTP_HOST set, that SMTP server. Without
 * it, nowhere: each email is written to the server log instead (the full text
 * in development; only recipient and subject otherwise, because reset-password
 * emails carry a token). Payload's own fallback, an ethereal.email test
 * account, would send every message to a third party, so it is never used.
 */
export function mailTransport() {
	const host = process.env.SMTP_HOST;
	if (host) {
		const port = Number(process.env.SMTP_PORT || 587);
		return nodemailer.createTransport({
			host,
			port,
			secure: port === 465,
			auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
		});
	}

	const verbose = process.env.NODE_ENV !== 'production';
	const log: Transport = {
		name: 'log',
		version: '1.0.0',
		send(mail, done) {
			const { to, subject, text } = mail.data;
			console.info(
				`[email not sent: SMTP_HOST is unset] to=${String(to)} subject=${String(subject)}` +
					(verbose && text ? `\n${String(text)}` : '')
			);
			done(null, { envelope: mail.message.getEnvelope(), messageId: mail.message.messageId() });
		}
	};
	return nodemailer.createTransport(log);
}
