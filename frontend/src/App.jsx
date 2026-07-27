import React from 'react';
import './styles/main.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ExamCheckPage from './pages/ExamCheckPage';
import ExamEntryPage from './pages/ExamEntryPage';
import MobileProctoringPage from './pages/MobileProctoringPage';
import MobileScanPage from './pages/MobileScanPage';
import MobileMonitoringPage from './pages/MobileProctoringPage';
import AdminRoute from './components/AdminRoute';

function Layout({ children }) {
  const location = useLocation();
  // 🌟 '/mobile/'로 시작하는 모든 모바일 페이지에서 전역 헤더를 숨깁니다.
  const isMobilePage = location.pathname.startsWith('/mobile/');

  return (
    <div className="app-wrapper">
      {!isMobilePage && <Header />}
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/home" element={<HomePage />} />

          {/* 초대 메일 링크 기반 응시자 입장 (응시번호 확인) */}
          <Route path="/exam/enter" element={<ExamEntryPage />} />

          {/* 장비 점검 페이지 */}
          <Route path="/exam/check" element={<ExamCheckPage />} />

          {/* 🌟 분리된 모바일 스캔 및 모니터링 페이지 */}
          <Route path="/mobile/scan" element={<MobileScanPage />} />
          <Route path="/mobile/monitoring" element={<MobileMonitoringPage />} />

          {/* 기존 통합 페이지 (필요시 유지) */}
          <Route path="/mobile/proctoring" element={<MobileProctoringPage />} />

          <Route path="/admin/dashboard" element={<AdminRoute><div className="container">대시보드</div></AdminRoute>} />
          <Route path="/admin/report" element={<AdminRoute><div className="container">리포트</div></AdminRoute>} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}