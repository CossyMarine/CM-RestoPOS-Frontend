import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./hooks/useAuth";
import { routeForUser } from "./utils/routeForUser";
import LoginPage from "./pages/LoginPage";
import Admin from "./pages/Admin";
import WaiterPage from "./pages/WaiterPage";
import KitchenPage from "./pages/KitchenPage";
import AccountantPage from "./pages/AccountantPage";
import CustomerPage from "./pages/CustomerPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400 text-sm">
      Loading…
    </div>
  );
}

function StaffRoute({ user, loading, allow, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const ok = allow === "admin" ? user.isAdmin : user.role === allow;
  if (!ok) return <Navigate to={routeForUser(user)} replace />;
  return children;
}

export default function App() {
  const { user, loading, refetch } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<CustomerPage />} />
        <Route path="/order" element={<Navigate to="/home" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/login"
          element={
            loading ? (
              <LoadingScreen />
            ) : user ? (
              <Navigate to={routeForUser(user)} replace />
            ) : (
              <LoginPage onAuthed={refetch} />
            )
          }
        />

        <Route
          path="/admin"
          element={
            <StaffRoute user={user} loading={loading} allow="admin">
              <Admin />
            </StaffRoute>
          }
        />
        <Route
          path="/waiter"
          element={
            <StaffRoute user={user} loading={loading} allow="waiter">
              <WaiterPage />
            </StaffRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <StaffRoute user={user} loading={loading} allow="kitchen">
              <KitchenPage />
            </StaffRoute>
          }
        />
        <Route
          path="/accountant"
          element={
            <StaffRoute user={user} loading={loading} allow="accountant">
              <AccountantPage />
            </StaffRoute>
          }
        />

        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </BrowserRouter>
  );
}
