import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Hash, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client';

export default function ExamEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [info, setInfo] = useState(null);
  const [examNumber, setExamNumber] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('초대 링크가 올바르지 않습니다. 메일에 포함된 링크를 다시 확인해주세요.');
      setLoading(false);
      return;
    }
    api.get(`/exam-entry/${token}`)
      .then(({ data }) => setInfo(data))
      .catch((error) => setLoadError(apiErrorMessage(error, '초대 링크를 확인할 수 없습니다.')))
      .finally(() => setLoading(false));
  }, [token]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setVerifyError('');
    if (!examNumber.trim()) {
      setVerifyError('응시번호를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/exam-entry/${token}/verify`, { examNumber: examNumber.trim() });
      sessionStorage.setItem('examEntry', JSON.stringify({ token, examId: data.exam.id, examTitle: data.exam.title, examineeName: data.examinee.name, examNumber: data.examinee.examNumber }));
      navigate('/exam/check');
    } catch (error) {
      setVerifyError(apiErrorMessage(error, '응시번호 확인에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="logo-icon" style={{ width: 52, height: 52, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
            <ShieldCheck color="#ffffff" size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: 'bold' }}>시험 입장</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>초대 메일의 응시번호를 입력하면 본인 확인 후 시험 사전 점검으로 이동합니다.</p>
        </div>

        {loading && <p className="text-muted" style={{ textAlign: 'center' }}>초대 링크를 확인하는 중...</p>}

        {!loading && loadError && (
          <div className="alert-box alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertTriangle size={20} />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && info && (
          <>
            <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: 'bold', marginBottom: '0.25rem' }}>{info.organization?.name}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>{info.exam.title}</div>
              <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>일정: {info.exam.date}</span>
                <span>제한 시간: {info.exam.duration} · {info.exam.questions}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                  <Clock size={14} /> 이 링크는 {new Date(info.expiresAt).toLocaleString('ko-KR')}까지 유효합니다.
                </span>
              </div>
            </div>

            <div className="alert-box" style={{ fontSize: '0.8rem', color: '#92400e', backgroundColor: '#fef3c7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              유의사항: 시험 중 신분증 및 얼굴 인증, 웹캠·마이크·화면 공유, 모바일 보조 카메라 연동이 필요합니다. 사전 환경 점검을 미리 완료해주세요.
            </div>

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>응시번호</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Hash size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    value={examNumber}
                    onChange={(e) => setExamNumber(e.target.value)}
                    placeholder="메일에 안내된 응시번호를 입력하세요"
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {verifyError && <div className="alert-box alert-error" style={{ padding: '0.65rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem' }}>{verifyError}</div>}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>{submitting ? '확인 중...' : '응시번호 확인하고 입장하기'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
