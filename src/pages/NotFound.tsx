import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import YouTubeOAuthProxy from "./YouTubeOAuthProxy";

const NotFound = () => {
  const location = useLocation();

  // Fallback: If path starts with /functions/v1/youtube-oauth, render the OAuth proxy
  // This catches edge cases where React Router doesn't match the exact route
  if (location.pathname.startsWith("/functions/v1/youtube-oauth")) {
    return <YouTubeOAuthProxy />;
  }

  useEffect(() => {
    document.title = "Page Not Found | RepostFlow";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
