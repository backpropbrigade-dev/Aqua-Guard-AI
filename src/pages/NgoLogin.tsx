import { Navigate } from "react-router-dom";

/** Legacy path — unified login with NGO role pre-selected */
export default function NgoLogin() {
  return <Navigate to="/login?role=ngo" replace />;
}
