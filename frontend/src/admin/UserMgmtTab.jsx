import React, { useEffect, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function UserMgmtTab() {
  const [managers, setManagers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const fetchManagers = async () => {
    try {
      const { data } = await api.get('/admin/managers', { headers: authHeaders() });
      setManagers(data);
    } catch (error) {
      setLoadError('관리자 계정 목록을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.');
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSuccessMsg('');
    if (!formData.name || !formData.email || !formData.password) {
      alert('이름, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }
    try {
      await api.post('/admin/managers', formData, { headers: authHeaders() });
      setFormData({ name: '', email: '', password: '' });
      setSuccessMsg('관리자 계정이 생성되었습니다. 이제 조직 승인 탭에서 조직을 배정할 수 있습니다.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchManagers();
    } catch (error) {
      alert(apiErrorMessage(error, '관리자 계정 생성에 실패했습니다.'));
    }
  };

  const handleUnassign = async (managerId) => {
    if (!window.confirm('이 관리자의 조직 배정을 해제하시겠습니까?')) return;
    try {
      await api.put(`/admin/managers/${managerId}/unassign-org`, {}, { headers: authHeaders() });
      fetchManagers();
    } catch (error) {
      alert(apiErrorMessage(error, '조직 배정 해제에 실패했습니다.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f5f3ff', borderRadius: '10px', color: '#7c3aed' }}>
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>관리자 계정 생성</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>ADMIN이 직접 관리자 계정을 발급합니다. 발급 후 [조직 승인/배정] 탭에서 조직을 배정하세요.</p>
          </div>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">이름</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="홍길동" className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">이메일</label>
            <input type="text" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="manager@aivle.com" className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">임시 비밀번호</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="form-input" />
          </div>
          <button type="submit" className="btn-primary">계정 생성</button>
        </form>
        {successMsg && <div className="alert-box alert-success" style={{ marginTop: '1rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.75rem', borderRadius: '6px' }}>{successMsg}</div>}
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
            <Users size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>관리자 계정 목록</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>전체 관리자 계정과 조직 배정 상태를 조회합니다.</p>
          </div>
        </div>

        {loadError && <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '0.75rem' }}>이름</th>
                <th style={{ padding: '0.75rem' }}>이메일</th>
                <th style={{ padding: '0.75rem' }}>배정된 조직</th>
                <th style={{ padding: '0.75rem' }}>조직 상태</th>
                <th style={{ padding: '0.75rem' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {managers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 관리자 계정이 없습니다.</td>
                </tr>
              ) : (
                managers.map((manager) => (
                  <tr key={manager.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{manager.name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{manager.email}</td>
                    <td style={{ padding: '0.75rem' }}>{manager.orgName ?? <span style={{ color: '#94a3b8' }}>미배정</span>}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {manager.orgStatus && (
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                          backgroundColor: manager.orgStatus === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                          color: manager.orgStatus === 'APPROVED' ? '#16a34a' : '#d97706'
                        }}>
                          {manager.orgStatus}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {manager.orgId && (
                        <button
                          onClick={() => handleUnassign(manager.id)}
                          style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          배정 해제
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
