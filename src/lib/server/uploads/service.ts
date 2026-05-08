import { PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from './config';

export type FileType = {
	mimetype: string;
	fileName: string;
	buffer: Buffer;
};

// Replace characters that have semantic meaning in URLs (#, ?, &, %) with `_`
// so the resulting public URL doesn't get truncated at a fragment/query
// boundary. S3 accepts these characters in keys, but browsers will not send
// anything after `#` to the server, so a download link breaks silently.
const sanitizeFileName = (name: string) => name.replace(/[#?&%]/g, '_');

export const uploadFile = async ({ file, location }: { file: FileType; location?: string }) => {
	const safeName = sanitizeFileName(file.fileName);
	const key = `${location ? `${location}/` : ''}${safeName}`;
	const uploadParams: PutObjectCommandInput = {
		Bucket: BUCKET_NAME,
		Key: key,
		Body: file.buffer,
		ContentType: file.mimetype,
		ACL: 'public-read'
	};

	try {
		const data = await s3Client.send(new PutObjectCommand(uploadParams));
		console.log('Success', data);
		return `https://dentalstaffusdocs.nyc3.cdn.digitaloceanspaces.com/${key}`;
	} catch (err) {
		console.log('Error', err);
		throw err;
	}
};
