import React, { useEffect, useState } from 'react';
import { FileText, Code, BarChart3, Search, ChevronRight } from 'lucide-react';
import { api, authHeaders } from '../api/client';

// 예시 응시자 리포트 상세 데이터 (자동 채점/화상 감독 엔진 연동 전까지의 표시용 데이터)
const SAMPLE_REPORTS = {
  'applicant1@aivle.com': {
    submitTime: '2026.07.20 14:30:00', totalScore: '85 / 100', passStatus: '합격 (정규 전형 진입)',
    problems: [
      { id: 1, name: 'LLM 기반 코드 리팩토링 및 성능 검증', score: '25/25', status: '정답' },
      { id: 2, name: '비동기 데이터 스트림 처리 최적화', score: '20/25', status: '부분 정답' },
      { id: 3, name: '지능형 이상 행동 감지 필터 구현', score: '25/25', status: '정답' },
      { id: 4, name: '대규모 로그 데이터 시멘틱 검색', score: '15/25', status: '부분 정답' },
    ],
    aiSupervision: { eyeTracking: '정상 (이탈률 1.2% 미만)', deviceCheck: '통과', violations: 0 },
    llmFeedback: '전체적인 알고리즘 설계와 시멘틱 코드 구조가 매우 우수합니다.'
  },
  'applicant2@aivle.com': {
    submitTime: '2026.07.20 14:28:15', totalScore: '70 / 100', passStatus: '보류 (관리자 검토 필요)',
    problems: [
      { id: 1, name: 'LLM 기반 코드 리팩토링 및 성능 검증', score: '20/25', status: '부분 정답' },
      { id: 2, name: '비동기 데이터 스트림 처리 최적화', score: '15/25', status: '부분 정답' },
      { id: 3, name: '지능형 이상 행동 감지 필터 구현', score: '20/25', status: '부분 정답' },
      { id: 4, name: '대규모 로그 데이터 시멘틱 검색', score: '15/25', status: '부분 정답' },
    ],
    aiSupervision: { eyeTracking: '주의 (시선 이탈 2회 감지)', deviceCheck: '통과', violations: 2 },
    llmFeedback: '기본적인 기능 구현은 완료되었으나 예외 처리 로직이 일부 누락되어 있습니다.'
  }
};

export default function ResultsTab() {
  const [examinees, setExaminees] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.get('/manager/examinees', { headers: authHeaders() })
      .then(({ data }) => setExaminees(data))
      .catch(() => setLoadError('응시자 결과 목록을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  const filteredList = examinees.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const detail = selectedStudent ? SAMPLE_REPORTS[selectedStudent.email] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2rem', backgroundColor: '#1e293b', color: '#ffffff', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
          <FileText size={24} color="#38bdf8" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'white' }}>응시자 점수·결과 관리</h2>
        </div>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
          우리 조직 응시자의 자동 채점 결과와 실시간 화상 감독 보안 로그를 관리자 권한으로 조회하고 관리합니다.
        </p>
      </div>

      {loadError && <div className="alert-box alert-error">{loadError}</div>}

      {selectedStudent && detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <button onClick={() => setSelectedStudent(null)} className="btn-secondary" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← 목록으로 돌아가기
          </button>

          <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>응시자 상세 정보</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: '4px 0 2px 0' }}>{selectedStudent.name} ({selectedStudent.email})</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>제출 완료 일시: {detail.submitTime}</p>
              </div>
              <div style={{ textAlign: 'right', backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>최종 점수 / 판정</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563EB' }}>{detail.totalScore}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a', marginTop: '2px' }}>{detail.passStatus}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} color="#2563EB" /> 문제별 자동 채점 세부 내역
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {detail.problems.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: p.status === '정답' ? '#dcfce7' : '#fef9c3', color: p.status === '정답' ? '#16a34a' : '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {p.id}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>상태: <span style={{ fontWeight: '600', color: p.status === '정답' ? '#16a34a' : '#d97706' }}>{p.status}</span></div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>{p.score}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 0.75rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={16} color="#16a34a" /> 화상 감독 보안 요약
                </h5>
                <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569' }}>
                  <div>시선 추적: <strong>{detail.aiSupervision.eyeTracking}</strong></div>
                  <div>장비 점검: <strong>{detail.aiSupervision.deviceCheck}</strong></div>
                  <div>부정행위 감지: <strong style={{ color: detail.aiSupervision.violations > 0 ? '#dc2626' : '#16a34a' }}>{detail.aiSupervision.violations}회</strong></div>
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 0.75rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#7c3aed" /> LLM 코드 리뷰 총평
                </h5>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>"{detail.llmFeedback}"</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>조직 응시자별 결과 목록</h3>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="응시자 이름 또는 이메일 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem' }}>응시자 성명</th>
                  <th style={{ padding: '0.75rem' }}>이메일</th>
                  <th style={{ padding: '0.75rem' }}>응시번호</th>
                  <th style={{ padding: '0.75rem' }}>진행 상태</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>리포트 상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 응시자가 없습니다.</td></tr>
                ) : (
                  filteredList.map((st) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{st.name}</td>
                      <td style={{ padding: '1rem 0.75rem', color: '#64748b' }}>{st.email}</td>
                      <td style={{ padding: '1rem 0.75rem', color: '#64748b' }}>{st.examNumber}</td>
                      <td style={{ padding: '1rem 0.75rem', fontWeight: '600', color: '#2563EB' }}>{st.statusText}</td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedStudent(st)}
                          disabled={!SAMPLE_REPORTS[st.email]}
                          style={{ padding: '0.4rem 0.8rem', backgroundColor: SAMPLE_REPORTS[st.email] ? '#eff6ff' : '#f1f5f9', color: SAMPLE_REPORTS[st.email] ? '#2563EB' : '#94a3b8', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: '600', fontSize: '0.8rem', cursor: SAMPLE_REPORTS[st.email] ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          리포트 열기 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
