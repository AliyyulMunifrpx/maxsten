import { Routes, Route } from "react-router-dom";
import AuthLayout from "./layouts/auth-layout";
import { ROUTES } from "./routes/paths";
import RegisterPage from "./pages/auth/register";
import VerifyEmailPage from "./pages/auth/verify-email";
import LoginPage from "./pages/auth/login";
import { Toaster } from "react-hot-toast";
import ForgotPasswordPage from "./pages/auth/forgot-password";
import UpdatePasswordPage from "./pages/auth/update-password";
import ProtectedRoute from "./pages/auth/protected-route";
import DashboardLayout from "./layouts/dashboard-layout";
import DashboardPage from "./pages/store/dashboard";
import CreateStorePage from './pages/store/create';

function App() {
  return (
    <>
      <Toaster position="top-center" />

      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.public.login} element={<LoginPage />} />
          <Route path={ROUTES.public.register} element={<RegisterPage />} />
          <Route path={ROUTES.public.verifyEmail} element={<VerifyEmailPage />} />
          <Route
            path={ROUTES.public.forgotPassword}
            element={<ForgotPasswordPage />}
          />
          <Route
            path={ROUTES.public.updatePassword}
            element={<UpdatePasswordPage />}
          />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.dashboard.home} element={<DashboardPage />} />
            <Route path={ROUTES.store.create} element={<CreateStorePage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
