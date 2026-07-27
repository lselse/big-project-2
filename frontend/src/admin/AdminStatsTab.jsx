import React, { useEffect, useState } from 'react';
import { PieChart, Building2, Users, FileText, UserCheck, AlertTriangle } from 'lucide-react';
import { api, authHeaders } from '../api/client';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ padding: '0.75rem', backgroundColor: color.bg, borderRadius: '10px', color: color.fg }}>
      <Icon size={22} />
    </div>
    <div>
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{value}</div>
    </div>
  </div>
);

export default function AdminStatsTab() {
  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/admin/overview', { headers: authHeaders() })
      .then(({ data }) => setOverview(data))
      .catch(() => setLoadError('통계 데이터를 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  if (loadError) return <div className="alert-box alert-error">{loadError}</div>;
  if (!overview) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieChart size={24} color="#2563EB" /> 전체 통계 및 리포트
        </h2>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>플랫폼 전체 조직/관리자/시험/응시자 현황을 한눈에 확인합니다.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard icon={Building2} label="전체 조직 수" value={overview.organizations.total} color={{ bg: '#eff6ff', fg: '#2563EB' }} />
        <StatCard icon={Building2} label="승인 대기 조직" value={overview.organizations.PENDING ?? 0} color={{ bg: '#fef3c7', fg: '#d97706' }} />
        <StatCard icon={Building2} label="승인 완료 조직" value={overview.organizations.APPROVED ?? 0} color={{ bg: '#dcfce7', fg: '#16a34a' }} />
        <StatCard icon={Users} label="관리자 계정 수" value={overview.managers} color={{ bg: '#f5f3ff', fg: '#7c3aed' }} />
        <StatCard icon={FileText} label="전체 시험 수" value={overview.exams} color={{ bg: '#eff6ff', fg: '#2563EB' }} />
        <StatCard icon={UserCheck} label="전체 응시자 수" value={overview.examinees} color={{ bg: '#f0fdf4', fg: '#16a34a' }} />
        <StatCard icon={AlertTriangle} label="누적 경고 발송 건수" value={overview.warnings} color={{ bg: '#fef2f2', fg: '#dc2626' }} />
      </div>
    </div>
  );
}
