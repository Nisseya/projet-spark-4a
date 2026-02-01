import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const host = env.POSTGRES_HOST ?? 'localhost';
const port = Number(env.POSTGRES_PORT ?? '5432');
const database = env.POSTGRES_DB ?? 'projet_spark';
const user = env.POSTGRES_USER ?? 'postgres';
const password = env.POSTGRES_PASSWORD ?? 'postgres';

const client = postgres({
	host,
	port,
	database,
	username: user,
	password
});

export const db = drizzle(client, { schema });
