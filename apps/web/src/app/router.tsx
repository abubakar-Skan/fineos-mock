import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/access/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { MasterPlanPage } from "../features/master-plan/MasterPlanPage";
import { PartyPage } from "../features/party/PartyPage";
import { IntakeWizard } from "../features/intake/IntakeWizard";
import { ConfirmationPage } from "../features/intake/ConfirmationPage";
import { CasePage } from "../features/cases/CasePage";
import { LookupPage } from "../features/lookups/LookupPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/parties/:partyId" element={<PartyPage />} />
      <Route path="/parties/:partyId/:view" element={<PartyPage />} />
      <Route path="/master-plans/:planId/members" element={<MasterPlanPage />} />
      <Route path="/notifications/:draftId/intake/:step" element={<IntakeWizard />} />
      <Route path="/notifications/:draftId/confirmation" element={<ConfirmationPage />} />
      <Route path="/cases/:caseId" element={<CasePage />} />
      <Route path="/cases/:caseId/:tab" element={<CasePage />} />
      <Route path="/lookups/:source" element={<LookupPage />} />
    </Routes>
  );
}
