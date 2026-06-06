import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Loading } from "@/components/loading";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return <Outlet />;
}
