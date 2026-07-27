import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { api, authHeaders } from '../api/client';

export default function AdminExamsTab() {
  const [exams, setExams] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/admin/exams', { headers: authHeaders() })
      .then(({ data }) => setExams(data))
      .catch(() => setLoadError('시험 목록을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  return (
    <div className="card" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563EB' }}>
          <FileText size={24} />
        </div>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>전체 시험 관리</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>모든 조직에서 생성된 시험을 통합 조회합니다.</p>
        </div>
      </div>

      {loadError && <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>{loadError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '0.75rem' }}>시험명</th>
              <th style={{ padding: '0.75rem' }}>소속 조직</th>
              <th style={{ padding: '0.75rem' }}>일정</th>
              <th style={{ padding: '0.75rem' }}>제한 시간</th>
              <th style={{ padding: '0.75rem' }}>문항 수</th>
              <th style={{ padding: '0.75rem' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 시험이 없습니다.</td></tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{exam.title}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{exam.orgName}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{exam.date}</td>
                  <td style={{ padding: '0.75rem' }}>{exam.duration}</td>
                  <td style={{ padding: '0.75rem' }}>{exam.questions}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{exam.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
