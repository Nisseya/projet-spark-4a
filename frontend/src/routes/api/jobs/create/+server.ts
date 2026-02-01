import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { db } from '$lib/server/db';
import { processingJob, video } from '$lib/server/db/schema';
import { presignPut } from '$lib/storage/s3';

export const POST: RequestHandler = async ({ locals, request }) => {
	// assume auth already happened
	const userId = locals.user.id;

	const body = await request.json();
	const contentType: string = body.contentType ?? 'video/mp4';

	const result = await db.transaction(async (tx) => {
		const [job] = await tx
			.insert(processingJob)
			.values({
				userId,
				status: 'INGESTING'
			})
			.returning({ id: processingJob.id });

		const s3Key = `videos/job_${job.id}.mp4`;

		await tx.insert(video).values({
			jobId: job.id,
			s3Key
		});

		const presign = await presignPut({
			key: s3Key,
			contentType,
			expiresInSeconds: 300
		});

		return {
			jobId: job.id,
			uploadUrl: presign.url,
			s3Key,
			expiresInSeconds: presign.expiresInSeconds
		};
	});

	return json(result, { status: 201 });
};
