import React, { useEffect, useState } from 'react';
import { Send, MailCheck } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function InviteMailTab() {
  const [exams, setExams] = useState([]);
  const [examinees, setExaminees] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [message, setMessage] = useState('');

  const fetchExamsAndExaminees = async () => {
    const [{ data: examList }, { data: examineeList }] = await Promise.all([
      api.get('/manager/exams', { headers: authHeaders() }),
      api.get('/manager/examinees', { headers: authHeaders() })
    ]);
    setExams(examList);
    setExaminees(examineeList);
  };

  useEffect(() => {
    fetchExamsAndExaminees();
  }, []);

  useEffect(() => {
    if (!selectedExamId) { setInvitations([]); return; }
    api.get(`/manager/exams/${selectedExamId}/invitations`, { headers: authHeaders() })
      .then(({ data }) => setInvitations(data))
      .catch(() => setInvitations([]));
  }, [selectedExamId]);

  const targets = examinees.filter((examinee) => examinee.examId === selectedExamId);

  const handleSend = async () => {
    if (!selectedExamId) {
      setMessage('초대 메일을 발송할 시험을 선택해주세요.');
      return;
    }
    try {
      const { data } = await api.post(`/manager/exams/${selectedExamId}/invitations`, {}, { headers: authHeaders() });
      setMessage(data.message);
      setInvitations(data.invitations);
      fetchExamsAndExaminees();
    } catch (error) {
      setMessage(apiErrorMessage(error, '초대 메일 발송에 실패했습니다.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563EB' }}>
            <Send size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>시험 초대 메일 발송 관리</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>시험에 배정된 응시자 전원에게 시험명·일정·입장 링크·응시번호·유의사항·링크 만료 시간이 담긴 초대 메일을 일괄 발송합니다.</p>
          </div>
        </div>

        <div className="input-group" style={{ maxWidth: '480px', marginBottom: '1rem' }}>
          <label className="input-label">대상 시험 선택</label>
          <select className="form-input" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
            <option value="">시험을 선택하세요</option>
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
          </select>
        </div>

        {selectedExamId && (
          <p className="text-muted" style={{ marginBottom: '1rem' }}>이 시험에 배정된 응시자 {targets.length}명 중 {targets.filter((t) => t.invitedAt).length}명이 초대 메일을 받았습니다.</p>
        )}

        <button className="btn-primary" style={{ width: 'fit-content' }} onClick={handleSend}>
          <Send size={16} style={{ marginRight: '6px' }} /> 초대 메일 일괄 발송
        </button>
        {message && <p className="text-muted" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>

      {selectedExamId && (
        <div className="card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <MailCheck size={20} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>발송 이력</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem' }}>응시자</th>
                  <th style={{ padding: '0.75rem' }}>발송 시각</th>
                  <th style={{ padding: '0.75rem' }}>링크 만료 시간</th>
                  <th style={{ padding: '0.75rem' }}>시험 입장 링크</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>발송 이력이 없습니다.</td></tr>
                ) : (
                  invitations.map((invitation) => {
                    const examinee = examinees.find((e) => e.id === invitation.examineeId);
                    const entryLink = `${window.location.origin}/exam/enter?token=${invitation.token}`;
                    return (
                      <tr key={invitation.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{examinee?.name ?? '알 수 없음'} ({examinee?.email})</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>{new Date(invitation.sentAt).toLocaleString('ko-KR')}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>{new Date(invitation.expiresAt).toLocaleString('ko-KR')}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <a href={entryLink} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#2563EB', wordBreak: 'break-all' }}>{entryLink}</a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
