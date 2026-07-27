import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, XCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

const STATUS_LABEL = { PENDING: '승인 대기', APPROVED: '승인 완료', REJECTED: '거절됨', SUSPENDED: '운영 중지' };
const STATUS_COLOR = {
  PENDING: { bg: '#fef3c7', fg: '#d97706' },
  APPROVED: { bg: '#dcfce7', fg: '#16a34a' },
  REJECTED: { bg: '#fee2e2', fg: '#dc2626' },
  SUSPENDED: { bg: '#e2e8f0', fg: '#475569' }
};

export default function OrgApprovalTab() {
  const [organizations, setOrganizations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [assignTargets, setAssignTargets] = useState({});

  const fetchAll = async () => {
    try {
      const [{ data: orgs }, { data: managerList }] = await Promise.all([
        api.get('/admin/organizations', { headers: authHeaders() }),
        api.get('/admin/managers', { headers: authHeaders() })
      ]);
      setOrganizations(orgs);
      setManagers(managerList);
    } catch (error) {
      setLoadError('조직 목록을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const notify = (message) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const changeStatus = async (orgId, action, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      await api.put(`/admin/organizations/${orgId}/${action}`, {}, { headers: authHeaders() });
      notify('조직 상태가 변경되었습니다.');
      fetchAll();
    } catch (error) {
      alert(apiErrorMessage(error, '처리 중 오류가 발생했습니다.'));
    }
  };

  const requesterName = (org) => managers.find((manager) => manager.id === org.requestedBy)?.name ?? '알 수 없음';

  const unassignedManagers = managers.filter((manager) => !manager.orgId);

  const handleAssign = async (orgId) => {
    const managerId = assignTargets[orgId];
    if (!managerId) {
      alert('배정할 관리자 계정을 선택해주세요.');
      return;
    }
    try {
      await api.put(`/admin/managers/${managerId}/assign-org`, { orgId }, { headers: authHeaders() });
      notify('조직이 관리자 계정에 배정되었습니다.');
      fetchAll();
    } catch (error) {
      alert(apiErrorMessage(error, '조직 배정에 실패했습니다.'));
    }
  };

  return (
    <div className="card" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563EB' }}>
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>조직 승인 및 배정</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>조직 생성 요청을 승인/거절하고, 승인된 조직을 관리자 계정에 배정합니다.</p>
        </div>
      </div>

      {loadError && <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}
      {successMsg && <div className="alert-box alert-success" style={{ marginBottom: '1rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.75rem', borderRadius: '6px' }}>{successMsg}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>조직명</th>
              <th style={{ padding: '0.75rem' }}>신청자</th>
              <th style={{ padding: '0.75rem' }}>상태</th>
              <th style={{ padding: '0.75rem' }}>배정된 관리자</th>
              <th style={{ padding: '0.75rem' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 조직이 없습니다.</td></tr>
            ) : (
              organizations.map((org) => {
                const assignedManager = managers.find((manager) => manager.orgId === org.id);
                const color = STATUS_COLOR[org.status];
                return (
                  <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{org.name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{requesterName(org)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: color.bg, color: color.fg, borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {STATUS_LABEL[org.status]}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{assignedManager?.name ?? '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                        {org.status === 'PENDING' && (
                          <>
                            <button onClick={() => changeStatus(org.id, 'approve')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.7rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <CheckCircle2 size={14} /> 승인
                            </button>
                            <button onClick={() => changeStatus(org.id, 'reject')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.7rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <XCircle size={14} /> 거절
                            </button>
                          </>
                        )}
                        {org.status === 'APPROVED' && (
                          <button onClick={() => changeStatus(org.id, 'suspend', '이 조직의 운영을 중지하시겠습니까? 배정된 관리자는 업무 화면에 접근할 수 없게 됩니다.')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.7rem', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <PauseCircle size={14} /> 운영 중지
                          </button>
                        )}
                        {org.status === 'SUSPENDED' && (
                          <button onClick={() => changeStatus(org.id, 'reactivate')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.7rem', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <PlayCircle size={14} /> 재개
                          </button>
                        )}
                        {org.status === 'APPROVED' && !assignedManager && (
                          <>
                            <select
                              value={assignTargets[org.id] ?? ''}
                              onChange={(e) => setAssignTargets({ ...assignTargets, [org.id]: e.target.value })}
                              style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                            >
                              <option value="">관리자 선택</option>
                              {unassignedManagers.map((manager) => (
                                <option key={manager.id} value={manager.id}>{manager.name} ({manager.email})</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssign(org.id)} style={{ padding: '0.4rem 0.7rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}>
                              배정
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
