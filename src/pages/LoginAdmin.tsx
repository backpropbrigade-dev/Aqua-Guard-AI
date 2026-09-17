import { Navigate } from "react-router-dom";

/** Legacy path — unified login with admin role pre-selected */
export default function LoginAdmin() {
  return <Navigate to="/login?role=admin" replace />;
}
