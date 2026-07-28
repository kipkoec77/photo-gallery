import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const WRITE_METHODS = new Set(["POST", "PATCH", "DELETE"]);
const PROTECTED_API_PREFIXES = [
	"/api/events",
	"/api/clients",
	"/api/albums",
	"/api/upload",
];

function isAdminPagePath(pathname: string): boolean {
	return pathname.startsWith("/admin");
}

function isAdminLoginPath(pathname: string): boolean {
	return pathname === "/admin/login";
}

function isProtectedApiWritePath(pathname: string, method: string): boolean {
	if (!WRITE_METHODS.has(method)) {
		return false;
	}

	return PROTECTED_API_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

function isApiPath(pathname: string): boolean {
	return pathname.startsWith("/api/");
}

async function hasSession(request: NextRequest): Promise<boolean> {
	const token = await getToken({
		req: request,
		secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
	});

	return Boolean(token);
}

function unauthorizedJson(): NextResponse {
	return NextResponse.json(
		{
			error: "Unauthorized.",
			code: "AUTH_REQUIRED",
		},
		{ status: 401 }
	);
}

function redirectToLogin(request: NextRequest): NextResponse {
	const loginUrl = new URL("/admin/login", request.url);
	loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
	return NextResponse.redirect(loginUrl);
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
	const { pathname } = request.nextUrl;
	const method = request.method.toUpperCase();

	const needsPageAuth = isAdminPagePath(pathname) && !isAdminLoginPath(pathname);
	const needsApiAuth = isProtectedApiWritePath(pathname, method);

	if (!needsPageAuth && !needsApiAuth) {
		return NextResponse.next();
	}

	const authenticated = await hasSession(request);
	if (authenticated) {
		return NextResponse.next();
	}

	if (isApiPath(pathname)) {
		return unauthorizedJson();
	}

	return redirectToLogin(request);
}

export const config = {
	matcher: ["/admin/:path*", "/api/:path*"],
};