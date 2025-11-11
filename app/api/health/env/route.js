export async function GET() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

	const urlValid = /^https?:\/\//i.test(url);
	const anonKeyValid = anonKey.length > 20;

	return Response.json({
		hasUrl: Boolean(url),
		urlValid,
		urlSample: url ? url.slice(0, 20) + "..." : null,
		hasAnonKey: Boolean(anonKey),
		anonKeyLength: anonKey.length || 0,
		anonKeyLikelyValid: anonKeyValid
	});
}

