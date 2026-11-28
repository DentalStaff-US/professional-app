export type UploadResult = { ok: true; url: string; filename: string } | { ok: false; error: string };

/** The drag-and-drop path has no file picker to enforce `accept`. */
export function matchesAccept(file: { name: string; type: string }, accept: string[]): boolean {
	const name = file.name.toLowerCase();
	return accept.some((rule) => {
		const pattern = rule.toLowerCase();
		if (pattern.startsWith('.')) return name.endsWith(pattern);
		if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
		return file.type === pattern;
	});
}

const PHOTO_MAX_EDGE = 2000;
const PHOTO_WORTH_SHRINKING = 450 * 1024;

export function shrunkDimensions(width: number, height: number, maxEdge = PHOTO_MAX_EDGE) {
	const scale = Math.min(1, maxEdge / Math.max(width, height));
	return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Phone photos run to several MB, which is slow on cellular and can exceed the
 * server's request limit. 2000px keeps a license readable. Anything the browser can't
 * decode, such as HEIC in Chrome, goes up as it is.
 */
export async function shrinkPhoto(file: File): Promise<File> {
	if (!file.type.startsWith('image/') || file.size < PHOTO_WORTH_SHRINKING) return file;
	try {
		const bitmap = await createImageBitmap(file);
		const { width, height } = shrunkDimensions(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
		if (!blob || blob.size >= file.size) return file;
		return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
	} catch {
		return file;
	}
}

export async function uploadFile(file: File): Promise<UploadResult> {
	const body = new FormData();
	body.append('file', await shrinkPhoto(file));
	body.append('location', 'candidate-documents');
	try {
		const response = await fetch('/api/uploadFile', { method: 'POST', body });
		if (response.status === 413) {
			return { ok: false, error: `${file.name} is too large to upload. Please try a smaller file.` };
		}
		const result = response.ok ? await response.json() : null;
		if (!result?.url) return { ok: false, error: `We couldn't upload ${file.name}. Please try again.` };
		return { ok: true, url: result.url, filename: result.fileName ?? file.name };
	} catch {
		return { ok: false, error: `We couldn't upload ${file.name}. Check your connection and try again.` };
	}
}
