import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ErrorScreen, RequireData } from "@/components/layout/RequireData";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminEditorProvider } from "@/contexts/AdminEditorContext";
import { AppDataProvider, useAppData } from "@/contexts/AppDataContext";
import { EditorPage } from "@/pages/admin/EditorPage";
import { QueuePage } from "@/pages/admin/QueuePage";
import { RubricPage } from "@/pages/admin/RubricPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { WeightsPage } from "@/pages/admin/WeightsPage";
import { ApplyPage } from "@/pages/public/ApplyPage";
import { AuditPage } from "@/pages/public/AuditPage";
import { HomePage } from "@/pages/public/HomePage";
import { LeaderboardPage } from "@/pages/public/LeaderboardPage";
import { MethodologyPage } from "@/pages/public/MethodologyPage";
import { ReauditPage } from "@/pages/public/ReauditPage";

function AdminSection() {
  const { db } = useAppData();
  if (!db) return null;
  return (
    <AdminEditorProvider db={db}>
      <Outlet />
    </AdminEditorProvider>
  );
}

function AppRoutes() {
  const { error } = useAppData();
  if (error) return <ErrorScreen message={error} />;

  return (
    <RequireData>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="methodology" element={<MethodologyPage />} />
          <Route path="apply" element={<ApplyPage />} />
          <Route path="audit/:id" element={<AuditPage />} />
          <Route path="reaudit/:id" element={<ReauditPage />} />
        </Route>
        <Route path="admin" element={<AdminLayout />}>
          <Route element={<AdminSection />}>
            <Route index element={<Navigate to="queue" replace />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="editor" element={<EditorPage />} />
            <Route path="rubric" element={<RubricPage />} />
            <Route path="weights" element={<WeightsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Route>
      </Routes>
    </RequireData>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <AdminAuthProvider>
          <AppRoutes />
          <Toaster />
        </AdminAuthProvider>
      </AppDataProvider>
    </BrowserRouter>
  );
}
