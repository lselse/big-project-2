import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api, authHeaders } from '../api/client';

export default function ExamStatusTab() {
  const [examinees, setExaminees] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/manager/examinees', { headers: authHeaders() })
      .then(({ data }) => setExaminees(data))
      .catch(() => setLoadError('응시 현황을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Users size={24} color="#2563EB" />
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>응시자 접속 및 제출 현황</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>현재 세션에 참여 중인 응시자의 등록/초대/응시 상태를 조회합니다.</p>
        </div>
      </div>

      {loadError && <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>응시자 성명</th>
              <th style={{ padding: '0.75rem' }}>이메일</th>
              <th style={{ padding: '0.75rem' }}>응시번호</th>
              <th style={{ padding: '0.75rem' }}>초대 메일</th>
              <th style={{ padding: '0.75rem' }}>진행 상태</th>
            </tr>
          </thead>
          <tbody>
            {examinees.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 응시자가 없습니다.</td></tr>
            ) : (
              examinees.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{item.name}</td>
                  <td style={{ padding: '1rem 0.75rem', color: '#64748b' }}>{item.email}</td>
                  <td style={{ padding: '1rem 0.75rem', color: '#64748b' }}>{item.examNumber}</td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold',
                      backgroundColor: item.invitedAt ? '#dcfce7' : '#f1f5f9',
                      color: item.invitedAt ? '#16a34a' : '#64748b'
                    }}>
                      {item.invitedAt ? '발송 완료' : '미발송'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.75rem', color: '#2563EB', fontWeight: '600' }}>{item.statusText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
