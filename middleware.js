import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  const isProtectedPath =
    pathname.startsWith("/year/") || pathname.startsWith("/subject/");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);

    // Keep cookie changes made during session refresh/cleanup on the redirect response.
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options);
    });

    return redirectResponse;
  }

  const { data: faceOk } = await supabase.rpc("face_session_ok");
  if (!faceOk) {
    const faceUrl = new URL("/face-check", request.url);
    faceUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const faceRedirect = NextResponse.redirect(faceUrl);

    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      faceRedirect.cookies.set(name, value, options);
    });

    return faceRedirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/year/:path*", "/subject/:path*"],
};