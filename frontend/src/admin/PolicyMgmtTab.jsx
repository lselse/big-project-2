import React, { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function PolicyMgmtTab() {
  const [policy, setPolicy] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/system-policy', { headers: authHeaders() })
      .then(({ data }) => setPolicy(data))
      .catch(() => setLoadError('시스템 정책을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  const handleSave = async () => {
    setMessage('');
    try {
      const { data } = await api.put('/admin/system-policy', policy, { headers: authHeaders() });
      setPolicy(data.systemPolicy);
      setMessage('시스템 정책이 저장되었습니다.');
    } catch (error) {
      setMessage(apiErrorMessage(error, '정책 저장에 실패했습니다.'));
    }
  };

  if (loadError) return <div className="alert-box alert-error">{loadError}</div>;
  if (!policy) return null;

  return (
    <div className="card" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
          <Settings size={24} />
        </div>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>전체 시스템 정책 관리</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>플랫폼 전체에 적용되는 가입/조직 승인/초대 링크 정책을 관리합니다.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: '500' }}>
          <input type="checkbox" checked={policy.selfSignupEnabled} onChange={(e) => setPolicy({ ...policy, selfSignupEnabled: e.target.checked })} style={{ width: '18px', height: '18px' }} />
          <span>관리자 자가 가입(조직 신청 겸용) 허용</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: '500' }}>
          <input type="checkbox" checked={policy.orgApprovalRequired} onChange={(e) => setPolicy({ ...policy, orgApprovalRequired: e.target.checked })} style={{ width: '18px', height: '18px' }} />
          <span>신규 조직은 ADMIN 승인 후에만 활성화</span>
        </label>
        <div className="input-group">
          <label className="input-label">초대 링크 만료 시간(시간)</label>
          <input type="number" min="1" value={policy.inviteLinkExpiryHours} onChange={(e) => setPolicy({ ...policy, inviteLinkExpiryHours: Number(e.target.value) })} className="form-input" />
        </div>
        <div className="input-group">
          <label className="input-label">응시 데이터 보관 기간(일)</label>
          <input type="number" min="1" value={policy.dataRetentionDays} onChange={(e) => setPolicy({ ...policy, dataRetentionDays: Number(e.target.value) })} className="form-input" />
        </div>
        <button className="btn-primary" style={{ width: 'fit-content', marginTop: '1rem' }} onClick={handleSave}>
          <Save size={16} style={{ marginRight: '6px' }} /> 정책 저장하기
        </button>
        {message && <p className="text-muted" style={{ margin: 0 }}>{message}</p>}
      </div>
    </div>
  );
}
