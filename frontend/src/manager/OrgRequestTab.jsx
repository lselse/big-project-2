import React, { useEffect, useState } from 'react';
import { Building2, Send, Clock, CheckCircle2, XCircle, PauseCircle, UserCog } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';
import { useCurrentUser } from '../hooks/useCurrentUser';

const describeStatus = (organization, assigned) => {
  if (!organization) return null;
  if (organization.status === 'PENDING') return { label: 'ADMIN 승인 대기 중', icon: Clock, color: '#d97706', bg: '#fef3c7' };
  if (organization.status === 'REJECTED') return { label: '승인이 거절되었습니다. 다시 신청해주세요.', icon: XCircle, color: '#dc2626', bg: '#fee2e2' };
  if (organization.status === 'SUSPENDED') return { label: '운영이 중지된 조직입니다. ADMIN에게 문의해주세요.', icon: PauseCircle, color: '#475569', bg: '#e2e8f0' };
  if (organization.status === 'APPROVED' && !assigned) return { label: '조직 승인 완료 — ADMIN의 계정 배정을 기다리는 중', icon: UserCog, color: '#2563EB', bg: '#eff6ff' };
  return { label: '승인 및 배정 완료', icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' };
};

export default function OrgRequestTab() {
  const { refresh } = useCurrentUser();
  const [organization, setOrganization] = useState(null);
  const [assigned, setAssigned] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/manager/organization', { headers: authHeaders() });
      setOrganization(data.organization);
      setAssigned(data.assigned);
      // 조직이 실제로 이 계정에 배정 완료되면 헤더/홈 화면이 최신 상태를 반영하도록 전체 새로고침으로 전환한다.
      if (data.assigned && data.organization?.status === 'APPROVED') {
        localStorage.setItem('userOrgId', data.organization.id);
        localStorage.setItem('userOrgName', data.organization.name);
        localStorage.setItem('userOrgStatus', data.organization.status);
        window.location.href = '/home?tab=EXAMINEE_MGMT';
        return;
      }
    } catch (error) {
      setMessage(apiErrorMessage(error, '조직 신청 현황을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!orgName.trim()) {
      setMessage('조직명을 입력해주세요.');
      return;
    }
    try {
      await api.post('/manager/organization-requests', { orgName }, { headers: authHeaders() });
      setOrgName('');
      setMessage('조직 신청이 접수되었습니다. ADMIN 승인을 기다려주세요.');
      await fetchStatus();
      await refresh();
    } catch (error) {
      setMessage(apiErrorMessage(error, '조직 신청에 실패했습니다.'));
    }
  };

  const handleCheckApproval = async () => {
    await fetchStatus();
    await refresh();
  };

  if (loading) return null;

  const info = describeStatus(organization, assigned);
  const canReapply = !organization || organization.status === 'REJECTED';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563EB' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>조직 신청</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>ADMIN이 조직을 승인하고 이 계정에 배정해야 시험 관리 업무를 시작할 수 있습니다.</p>
          </div>
        </div>

        {organization && info && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: info.bg, borderRadius: '8px', marginBottom: '1.5rem' }}>
            <info.icon size={20} color={info.color} />
            <div>
              <div style={{ fontWeight: 'bold', color: info.color }}>{organization.name}</div>
              <div style={{ fontSize: '0.85rem', color: info.color }}>{info.label}</div>
            </div>
          </div>
        )}

        {canReapply && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">신청할 조직명</label>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="예: A대학교 컴퓨터공학과" className="form-input" />
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>
              <Send size={16} style={{ marginRight: '6px' }} /> 조직 승인 신청하기
            </button>
          </form>
        )}

        {organization && !canReapply && (
          <button className="btn-secondary" onClick={handleCheckApproval}>승인/배정 현황 새로고침</button>
        )}

        {message && <p className="text-muted" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>
    </div>
  );
}
