import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

// 🌟 ADMIN 전용 탭 컴포넌트
import OrgApprovalTab from '../admin/OrgApprovalTab';
import UserMgmtTab from '../admin/UserMgmtTab';
import AdminExamsTab from '../admin/AdminExamsTab';
import AdminResultsTab from '../admin/AdminResultsTab';
import PolicyMgmtTab from '../admin/PolicyMgmtTab';
import AiConfigTab from '../admin/AiConfigTab';
import AdminStatsTab from '../admin/AdminStatsTab';

// 🌟 관리자(MANAGER) 전용 탭 컴포넌트
import OrgRequestTab from '../manager/OrgRequestTab';
import ExamineeMgmtTab from '../manager/ExamineeMgmtTab';
import ManagerExamCreateTab from '../manager/ExamCreateTab';
import InviteMailTab from '../manager/InviteMailTab';
import ManagerPolicyTab from '../manager/PolicyMgmtTab';
import LiveMonitoringTab from '../manager/LiveMonitoringTab';
import ExamStatusTab from '../manager/ExamStatusTab';
import CheatLogsTab from '../manager/CheatLogsTab';
import ResultsTab from '../manager/ResultsTab';
import TeamTab from '../manager/TeamTab';

// 🌟 응시자 전용 탭 컴포넌트 임포트
import HomeTab from '../applicant/HomeTab';
import ExamTab from '../applicant/ExamTab';
import CheckTab from '../applicant/CheckTab';
import PracticeTab from '../applicant/PracticeTab';
import NoticeTab from '../applicant/NoticeTab';
import FaqTab from '../applicant/FaqTab';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const userRole = location.state?.role || localStorage.getItem('userRole') || 'GUEST';
  const orgApproved = localStorage.getItem('userOrgId') && localStorage.getItem('userOrgStatus') === 'APPROVED';

  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';

  // 🌟 권한별 기본 탭 설정
  const getDefaultTab = () => {
    if (isAdmin) return 'ORG_APPROVAL';
    if (isManager) return orgApproved ? 'EXAMINEE_MGMT' : 'ORG_REQUEST';
    return 'HOME';
  };

  const defaultTab = getDefaultTab();
  const activeTab = location.pathname === '/' ? defaultTab : (searchParams.get('tab') || defaultTab);

  const handleProtectedAction = (actionRoute) => {
    if (userRole === 'GUEST') {
      const confirmLogin = window.confirm('🔒 이 기능은 로그인이 필요합니다.\n로그인/회원가입 페이지로 이동하시겠습니까?');
      if (confirmLogin) navigate('/login');
    } else {
      navigate(actionRoute);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)', padding: '2.5rem 0' }}>
      <main className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>

        {/* =========================================================================
            🛡️ [ADMIN 전용 탭 라우팅 허브]
            ========================================================================= */}
        {isAdmin && (
          <div>
            {activeTab === 'ORG_APPROVAL' && <OrgApprovalTab />}
            {activeTab === 'MANAGER_MGMT' && <UserMgmtTab />}
            {activeTab === 'ADMIN_EXAMS' && <AdminExamsTab />}
            {activeTab === 'ADMIN_RESULTS' && <AdminResultsTab />}
            {activeTab === 'SYSTEM_POLICY' && <PolicyMgmtTab />}
            {activeTab === 'AI_CONFIG' && <AiConfigTab />}
            {activeTab === 'ADMIN_STATS' && <AdminStatsTab />}
          </div>
        )}

        {/* =========================================================================
            🏢 [관리자(MANAGER) 전용 탭 라우팅 허브]
            조직이 아직 승인/배정되지 않았다면 조직 신청 화면만 노출한다.
            ========================================================================= */}
        {isManager && (
          <div>
            {!orgApproved ? (
              <OrgRequestTab />
            ) : (
              <>
                {activeTab === 'EXAMINEE_MGMT' && <ExamineeMgmtTab />}
                {activeTab === 'EXAM_CREATE' && <ManagerExamCreateTab />}
                {activeTab === 'INVITE_MAIL' && <InviteMailTab />}
                {activeTab === 'POLICY_MGMT' && <ManagerPolicyTab />}
                {activeTab === 'LIVE_MONITORING' && <LiveMonitoringTab />}
                {activeTab === 'EXAM_STATUS' && <ExamStatusTab />}
                {activeTab === 'CHEAT_LOGS' && <CheatLogsTab />}
                {activeTab === 'RESULTS' && <ResultsTab />}
                {activeTab === 'TEAM' && <TeamTab />}
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            👤 [일반 응시자 / 게스트 전용 탭 라우팅 허브]
            ========================================================================= */}
        {!isAdmin && !isManager && (
          <>
            {/* 타이틀 및 비회원 경고 바 (HOME이 아닐 때만 렌더링) */}
            {activeTab !== 'HOME' && (
              <div className="content-header-bar" style={{ marginBottom: '2rem' }}>
                <h1 className="content-main-title" style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {activeTab === 'EXAM' && '평가 목록'}
                  {activeTab === 'CHECK' && '사전 환경 점검 안내'}
                  {activeTab === 'PRACTICE' && '연습문제 목록'}
                  {activeTab === 'NOTICE' && '공지사항'}
                  {activeTab === 'FAQ' && '자주 묻는 질문 (FAQ)'}
                </h1>
                {userRole === 'GUEST' && (
                  <span className="badge-status alert-error" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                    ⚠️ 비회원 상태입니다. 상세 기능 이용 시 로그인이 요구됩니다.
                  </span>
                )}
              </div>
            )}

            {/* 각 응시자 탭 컴포넌트 렌더링 */}
            {activeTab === 'HOME' && <HomeTab />}
            {activeTab === 'EXAM' && <ExamTab onProtectedAction={handleProtectedAction} />}
            {activeTab === 'CHECK' && <CheckTab onProtectedAction={handleProtectedAction} />}
            {activeTab === 'PRACTICE' && <PracticeTab onProtectedAction={handleProtectedAction} />}
            {activeTab === 'NOTICE' && <NoticeTab />}
            {activeTab === 'FAQ' && <FaqTab />}
          </>
        )}

      </main>
    </div>
  );
}
