import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api, authHeaders } from '../api/client';

export default function AdminResultsTab() {
  const [examinees, setExaminees] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/admin/examinees', { headers: authHeaders() })
      .then(({ data }) => setExaminees(data))
      .catch(() => setLoadError('응시자 목록을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  return (
    <div className="card" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
          <BarChart3 size={24} />
        </div>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>전체 응시자 및 결과 조회</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>모든 조직의 응시자 등록/응시 현황을 통합 조회합니다.</p>
        </div>
      </div>

      {loadError && <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>응시자</th>
              <th style={{ padding: '0.75rem' }}>이메일</th>
              <th style={{ padding: '0.75rem' }}>응시번호</th>
              <th style={{ padding: '0.75rem' }}>소속 조직</th>
              <th style={{ padding: '0.75rem' }}>상태</th>
              <th style={{ padding: '0.75rem' }}>초대 발송</th>
            </tr>
          </thead>
          <tbody>
            {examinees.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 응시자가 없습니다.</td></tr>
            ) : (
              examinees.map((examinee) => (
                <tr key={examinee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{examinee.name}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{examinee.email}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{examinee.examNumber}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{examinee.orgName}</td>
                  <td style={{ padding: '0.75rem' }}>{examinee.statusText}</td>
                  <td style={{ padding: '0.75rem' }}>{examinee.invitedAt ? '발송 완료' : '미발송'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
