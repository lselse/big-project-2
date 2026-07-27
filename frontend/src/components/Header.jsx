import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, LogOut, LogIn, User, PlusSquare, FileText,
  Users, Cpu, Monitor, AlertTriangle, BarChart3, ChevronDown,
  Building2, Send, Award, ClipboardCheck, Settings, PieChart, UserPlus
} from 'lucide-react';
import { clearSession } from '../hooks/useCurrentUser';

const ADMIN_GROUPS = [
  {
    label: '조직·관리자', icon: Building2,
    items: [
      { key: 'ORG_APPROVAL', label: '조직 승인/배정', icon: Building2 },
      { key: 'MANAGER_MGMT', label: '관리자 계정 관리', icon: Users }
    ]
  },
  {
    label: '운영 현황', icon: BarChart3,
    items: [
      { key: 'ADMIN_EXAMS', label: '전체 시험 관리', icon: FileText },
      { key: 'ADMIN_RESULTS', label: '전체 응시자·결과', icon: BarChart3 },
      { key: 'ADMIN_STATS', label: '전체 통계', icon: PieChart }
    ]
  },
  {
    label: '시스템 설정', icon: Settings,
    items: [
      { key: 'SYSTEM_POLICY', label: '시스템 정책 관리', icon: Settings },
      { key: 'AI_CONFIG', label: 'AI 분석 설정', icon: Cpu }
    ]
  }
];

const MANAGER_GROUPS = [
  {
    label: '응시자 관리', icon: UserPlus,
    items: [
      { key: 'EXAMINEE_MGMT', label: '응시자 이메일 관리', icon: UserPlus },
      { key: 'TEAM', label: '관리자 인원 추가', icon: Users }
    ]
  },
  {
    label: '시험 운영', icon: PlusSquare,
    items: [
      { key: 'EXAM_CREATE', label: '시험 생성/대상자 배정', icon: PlusSquare },
      { key: 'INVITE_MAIL', label: '초대 메일 발송', icon: Send },
      { key: 'POLICY_MGMT', label: '시험·문제·부정행위 정책', icon: FileText }
    ]
  },
  {
    label: '감독·결과', icon: Monitor,
    items: [
      { key: 'LIVE_MONITORING', label: '실시간 화상 관제', icon: Monitor },
      { key: 'EXAM_STATUS', label: '응시 현황', icon: ClipboardCheck },
      { key: 'CHEAT_LOGS', label: '부정행위 감지 로그', icon: AlertTriangle },
      { key: 'RESULTS', label: '점수·결과 관리', icon: Award }
    ]
  }
];

function NavGroup({ group, currentTab, onSelect }) {
  const GroupIcon = group.icon;
  const isGroupActive = group.items.some((item) => item.key === currentTab);

  return (
    <div className="header-nav-group">
      <button type="button" className={`header-tab-btn ${isGroupActive ? 'active' : ''}`}>
        <GroupIcon size={16} style={{ marginRight: 6 }} /> {group.label}
        <ChevronDown size={14} style={{ marginLeft: 4 }} />
      </button>
      <div className="header-nav-dropdown">
        {group.items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`header-nav-dropdown-item ${currentTab === key ? 'active' : ''}`}
            onClick={(event) => { event.currentTarget.blur(); onSelect(key); }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const userRole = localStorage.getItem('userRole') || 'GUEST';
  const userEmail = localStorage.getItem('userEmail') || '비회원(게스트)';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0];
  const orgApproved = localStorage.getItem('userOrgId') && localStorage.getItem('userOrgStatus') === 'APPROVED';

  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';

  const defaultTab = isAdmin ? 'ORG_APPROVAL' : (isManager ? (orgApproved ? 'EXAMINEE_MGMT' : 'ORG_REQUEST') : 'HOME');

  const currentTab = location.pathname === '/' ? defaultTab : (searchParams.get('tab') || defaultTab);

  const handleTabClick = (tabName) => {
    if (!isAdmin && !isManager && tabName === 'HOME') {
      navigate('/');
    } else {
      navigate(`/home?tab=${tabName}`);
    }
  };

  const handleLogout = () => {
    clearSession();
    alert('로그아웃되었습니다.');
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login';

  return (
    <header className="header">
      <div className="header-left-group">
        <div className="logo-area" onClick={() => navigate(isAdmin || isManager ? `/home?tab=${defaultTab}` : '/')}>
          <div className="logo-icon" style={{ width: 34, height: 34 }}>
            <ShieldCheck color="#ffffff" size={20} />
          </div>
          <span className="logo-title">AI 리터러시 역량 평가 플랫폼</span>
        </div>

        {!isAuthPage && (
          <nav className="header-nav">
            {isAdmin ? (
              ADMIN_GROUPS.map((group) => (
                <NavGroup key={group.label} group={group} currentTab={currentTab} onSelect={handleTabClick} />
              ))
            ) : isManager ? (
              orgApproved ? (
                MANAGER_GROUPS.map((group) => (
                  <NavGroup key={group.label} group={group} currentTab={currentTab} onSelect={handleTabClick} />
                ))
              ) : (
                <button className={`header-tab-btn active`} onClick={() => handleTabClick('ORG_REQUEST')}>
                  <Building2 size={16} style={{ marginRight: 6 }} /> 조직 신청
                </button>
              )
            ) : (
              /* ================= 비회원/방문자 전용 탭 (홈, 공지사항, FAQ만 노출) ================= */
              <>
                <button className={`header-tab-btn ${currentTab === 'HOME' ? 'active' : ''}`} onClick={() => handleTabClick('HOME')}>홈</button>
                <button className={`header-tab-btn ${currentTab === 'NOTICE' ? 'active' : ''}`} onClick={() => handleTabClick('NOTICE')}>공지사항</button>
                <button className={`header-tab-btn ${currentTab === 'FAQ' ? 'active' : ''}`} onClick={() => handleTabClick('FAQ')}>FAQ</button>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="nav-right">
        {userRole && userRole !== 'GUEST' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="header-user-badge">
              <User size={14} color={isAdmin ? '#7c3aed' : '#16a34a'} />
              <span>
                {userName}님 ({isAdmin ? 'ADMIN' : '관리자'})
              </span>
            </div>
            <button className="logout-btn header-logout-btn" onClick={handleLogout}>
              <LogOut size={15} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          <button className="nav-action-btn" onClick={() => navigate('/login')}>
            <LogIn size={15} style={{ marginRight: 4 }} />
            <span>로그인 / 회원가입</span>
          </button>
        )}
      </div>
    </header>
  );
}