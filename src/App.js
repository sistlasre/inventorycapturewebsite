import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
// Components
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import Users from './components/Users';
import Dashboard from './components/Dashboard';
import ProjectDetails from './components/ProjectDetails';
import ProjectVerboseView from './components/ProjectVerboseView';
import AllPartsForProjectTableView from './components/AllPartsForProject';
import PartsComparisonTool from './components/PartsComparisonTool';
import TariffExplorer from './components/TariffExplorer';
import ExpertECCN from './components/ExpertECCN';
import BoxDetails from './components/BoxDetails';
import PartDetails from './components/PartDetails';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import Pricing from './components/Pricing';
import VerifyAccount from './components/VerifyAccount';
import { AuthProvider } from './contexts/AuthContext';

function Layout({ children }) {
  const location = useLocation();
  const dontShowHeaderAndFooter = location.pathname?.includes("tariff_explorer_raw");
  return (
    <div className="App d-flex flex-column min-vh-100" style={{ maxWidth: '90%', margin: 'auto' }}>
      {!dontShowHeaderAndFooter && <Header />}
      <main className="flex-grow-1">{children}</main>
      {!dontShowHeaderAndFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-account" element={<VerifyAccount />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/tariff_explorer" element={<TariffExplorer />} />
              <Route path="/tariff_explorer_raw" element={<TariffExplorer />} />
              <Route path="/expert_eccn" element={<ExpertECCN />} />
              <Route
                path="/user/pricing"
                element={
                  <ProtectedRoute>
                    <Pricing getUserSpecificLinks={true} />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <Users pageHeader="All Accounts" showNumCredits={true} />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/subaccounts/:parentUser" 
                element={
                  <ProtectedRoute>
                    <Users pageHeader="Sub Accounts"/>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/:parentUser" 
                element={
                  <ProtectedRoute>
                    <Users pageHeader="Accounts"/>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/project/:projectId" 
                element={
                  <ProtectedRoute>
                    <ProjectDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/project/:projectId/edit"
                element={
                  <ProtectedRoute>
                    <ProjectVerboseView />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/project/:projectId/view"
                element={
                    <ProjectVerboseView isViewOnly={true} />
                }
              />
              <Route
                path="/project/:projectId/verbose"
                element={
                  <ProtectedRoute>
                    <ProjectVerboseView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/allparts"
                element={
                  <ProtectedRoute>
                    <AllPartsForProjectTableView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/allparts/edit"
                element={
                  <ProtectedRoute>
                    <AllPartsForProjectTableView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/allparts/view"
                element={
                    <AllPartsForProjectTableView isViewOnly={true} />
                }
              />
              <Route
                path="/project/:projectId/compare"
                element={
                  <ProtectedRoute>
                    <PartsComparisonTool />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/box/:boxId" 
                element={
                  <ProtectedRoute>
                    <BoxDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/part/:partId" 
                element={
                  <ProtectedRoute>
                    <PartDetails />
                  </ProtectedRoute>
                } 
              />
            </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
