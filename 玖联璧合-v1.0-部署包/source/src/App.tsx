import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout';
import { SupplierLayout } from './components/SupplierLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { AgentManagement } from './pages/AgentManagement';
import { AgentAudit } from './pages/AgentAudit';
import { ActiveProjects } from './pages/ActiveProjects';
import { Projects } from './pages/Projects';
import { TenderCenter } from './pages/TenderCenter';
import { QuoteComparison } from './pages/QuoteComparison';
import { PotentialCustomers } from './pages/PotentialCustomers';
import { StatsAnalysis } from './pages/StatsAnalysis';
import { ProjectAlerts } from './pages/ProjectAlerts';
import { ProjectHistory } from './pages/ProjectHistory';
import { SubAccountManagement } from './pages/SubAccountManagement';
import { AgentAccountManagement } from './pages/AgentAccountManagement';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { AgentApplication } from './pages/supplier/AgentApplication';
import { BiddingCenter } from './pages/supplier/BiddingCenter';
import { Notifications } from './pages/supplier/Notifications';
import BidAwardDetail from './pages/supplier/BidAwardDetail';
import ContractSign from './pages/supplier/ContractSign';
import AgentSubmitBid from './pages/supplier/AgentSubmitBid';
import { ContractManagement } from './pages/ContractManagement';
import { ContractDetail } from './pages/ContractDetail';
import AgentContracts from './pages/supplier/AgentContracts';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { FreeTemplates } from './pages/FreeTemplates';
import { FreeTemplateManagement } from './pages/Settings/FreeTemplateManagement';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/free-templates" element={<FreeTemplates />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="dashboard/stats" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="dashboard"><StatsAnalysis /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="customers"><Customers /></ProtectedRoute>} />
          <Route path="customers/potential" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="customers"><PotentialCustomers /></ProtectedRoute>} />
          <Route
            path="customers/levels"
            element={
              <ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="customers">
                <div className="p-8 text-center text-gray-500">
                  客户分级功能开发中...
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="agents" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="agents"><AgentManagement /></ProtectedRoute>} />
          <Route path="agents/audit" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="agents"><AgentAudit /></ProtectedRoute>} />
          <Route path="projects" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="projects"><ActiveProjects /></ProtectedRoute>} />
          <Route path="projects/tracking" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="projects"><Projects /></ProtectedRoute>} />
          <Route path="projects/alerts" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="projects"><ProjectAlerts /></ProtectedRoute>} />
          <Route path="projects/history" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="projects"><ProjectHistory /></ProtectedRoute>} />
          <Route path="tenders" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="tenders"><TenderCenter /></ProtectedRoute>} />
          <Route path="tenders/compare/:tenderId" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="tenders"><QuoteComparison /></ProtectedRoute>} />
          <Route path="contracts" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="tenders"><ContractManagement /></ProtectedRoute>} />
          <Route path="contracts/:contractId" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="tenders"><ContractDetail /></ProtectedRoute>} />
          <Route path="settings/sub-accounts" element={<ProtectedRoute allowedRoles={['admin', 'staff']} moduleName="system"><SubAccountManagement /></ProtectedRoute>} />
          <Route path="settings/agent-accounts" element={<ProtectedRoute allowedRoles={['admin']} moduleName="system"><AgentAccountManagement /></ProtectedRoute>} />
          <Route path="settings/free-templates" element={<ProtectedRoute allowedRoles={['admin']} moduleName="system"><FreeTemplateManagement /></ProtectedRoute>} />
        </Route>

        <Route
          path="/supplier"
          element={
            <ProtectedRoute allowedRoles={['agent']}>
              <SupplierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SupplierDashboard />} />
          <Route path="application" element={<AgentApplication />} />
          <Route path="bidding" element={<BiddingCenter />} />
          <Route path="bid/:id" element={<AgentSubmitBid />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="award/:id" element={<BidAwardDetail />} />
          <Route path="contract/:id" element={<ContractSign />} />
          <Route path="contracts" element={<AgentContracts />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
