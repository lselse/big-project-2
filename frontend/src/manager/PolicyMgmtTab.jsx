import React, { useEffect, useState } from 'react';
import { FileText, ShieldAlert, Save, PlusCircle } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function PolicyMgmtTab() {
  const [policy, setPolicy] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [newProblem, setNewProblem] = useState({ title: '', points: 25, languages: '' });

  const fetchPolicy = async () => {
    try {
      const { data } = await api.get('/manager/policy', { headers: authHeaders() });
      setPolicy(data);
    } catch (error) {
      setLoadError('시험·문제·부정행위 정책을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleAddProblem = async (event) => {
    event.preventDefault();
    if (!newProblem.title.trim()) {
      setMessage('문제 제목을 입력해주세요.');
      return;
    }
    try {
      const { data } = await api.post('/manager/policy/problems', newProblem, { headers: authHeaders() });
      setPolicy(data);
      setNewProblem({ title: '', points: 25, languages: '' });
      setMessage('문제가 추가되었습니다.');
    } catch (error) {
      setMessage(apiErrorMessage(error, '문제 추가에 실패했습니다.'));
    }
  };

  const toggleRule = (ruleId) => {
    setPolicy((prev) => ({
      ...prev,
      cheatRules: prev.cheatRules.map((rule) => rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)
    }));
  };

  const handleSaveRules = async () => {
    try {
      const { data } = await api.put('/manager/policy/cheat-rules', { rules: policy.cheatRules }, { headers: authHeaders() });
      setPolicy(data);
      setMessage('부정행위 금지사항 정책이 저장되었습니다.');
    } catch (error) {
      setMessage(apiErrorMessage(error, '정책 저장에 실패했습니다.'));
    }
  };

  if (loadError) return <div className="alert-box alert-error">{loadError}</div>;
  if (!policy) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {message && <div className="alert-box" style={{ padding: '0.75rem', backgroundColor: '#eff6ff', color: '#2563EB', borderRadius: '6px' }}>{message}</div>}

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>문제 및 시험 정책 관리</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>코딩 테스트 문제 세트를 등록하고 언어/배점 정책을 구성합니다.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {policy.problems.length === 0 ? (
            <p className="text-muted">등록된 문제가 없습니다.</p>
          ) : (
            policy.problems.map((problem) => (
              <div key={problem.id} style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{problem.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>배점: {problem.points}점 | 언어 제한: {problem.languages}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAddProblem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">문제 제목</label>
            <input type="text" value={newProblem.title} onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} placeholder="예: 비동기 데이터 스트림 처리 최적화" className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">배점</label>
            <input type="number" value={newProblem.points} onChange={(e) => setNewProblem({ ...newProblem, points: Number(e.target.value) })} className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">언어 제한</label>
            <input type="text" value={newProblem.languages} onChange={(e) => setNewProblem({ ...newProblem, languages: e.target.value })} placeholder="Python3, Java17" className="form-input" />
          </div>
          <button type="submit" className="btn-secondary">
            <PlusCircle size={16} style={{ marginRight: '6px' }} /> 문제 추가
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>부정행위 금지사항 정책 관리</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>실시간 AI 감독 시스템이 감지할 금지 항목과 제재 기준을 설정합니다.</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {policy.cheatRules.map((rule) => (
            <label key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: '500' }}>
              <input type="checkbox" checked={rule.enabled} onChange={() => toggleRule(rule.id)} style={{ width: '18px', height: '18px' }} />
              <span>{rule.label}</span>
            </label>
          ))}
          <button className="btn-primary" style={{ width: 'fit-content', marginTop: '1rem' }} onClick={handleSaveRules}>
            <Save size={16} style={{ marginRight: '6px' }} /> 정책 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
