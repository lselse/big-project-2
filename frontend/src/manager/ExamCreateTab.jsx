import React, { useEffect, useState } from 'react';
import { PlusSquare, PlusCircle, Users2 } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function ExamCreateTab() {
  const [formData, setFormData] = useState({ title: '', duration: '', questions: '', date: '' });
  const [message, setMessage] = useState('');
  const [exams, setExams] = useState([]);
  const [examinees, setExaminees] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedExaminees, setSelectedExaminees] = useState([]);

  const fetchAll = async () => {
    try {
      const [{ data: examList }, { data: examineeList }] = await Promise.all([
        api.get('/manager/exams', { headers: authHeaders() }),
        api.get('/manager/examinees', { headers: authHeaders() })
      ]);
      setExams(examList);
      setExaminees(examineeList);
    } catch (error) {
      setMessage('시험/응시자 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/manager/exams', formData, { headers: authHeaders() });
      setFormData({ title: '', duration: '', questions: '', date: '' });
      setMessage('시험이 등록되었습니다. 아래 목록에서 시험 대상자를 배정할 수 있습니다.');
      fetchAll();
    } catch (error) {
      setMessage(apiErrorMessage(error, '시험 등록에 실패했습니다.'));
    }
  };

  const toggleExaminee = (id) => {
    setSelectedExaminees((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!selectedExamId) {
      setMessage('대상자를 배정할 시험을 선택해주세요.');
      return;
    }
    if (selectedExaminees.length === 0) {
      setMessage('배정할 응시자를 선택해주세요.');
      return;
    }
    try {
      const { data } = await api.put(`/manager/exams/${selectedExamId}/assignees`, { examineeIds: selectedExaminees }, { headers: authHeaders() });
      setMessage(data.message);
      setSelectedExaminees([]);
      fetchAll();
    } catch (error) {
      setMessage(apiErrorMessage(error, '시험 대상자 배정에 실패했습니다.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '10px', color: '#2563EB' }}>
            <PlusSquare size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>시험 생성 및 일정 관리</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>우리 조직의 역량 평가 세션을 등록하고 일정을 설정합니다.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
          <div className="input-group">
            <label className="input-label">시험 명칭</label>
            <input type="text" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} placeholder="예: 2026년 하반기 신입 공채 AI 리터러시 역량 평가" className="form-input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">제한 시간</label>
              <input type="text" value={formData.duration} onChange={(event) => setFormData({ ...formData, duration: event.target.value })} placeholder="90분" className="form-input" />
            </div>
            <div className="input-group">
              <label className="input-label">문항 수</label>
              <input type="text" value={formData.questions} onChange={(event) => setFormData({ ...formData, questions: event.target.value })} placeholder="총 4문제" className="form-input" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">시험 일정</label>
            <input type="text" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} placeholder="2026.08.01 ~ 2026.08.03" className="form-input" />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: 'fit-content' }}>
            <PlusCircle size={16} style={{ marginRight: '6px' }} /> 시험 등록하기
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Users2 size={22} color="#16a34a" />
          <h2 className="card-title" style={{ margin: 0 }}>시험 대상자 배정</h2>
        </div>
        <div className="input-group" style={{ maxWidth: '480px', marginBottom: '1rem' }}>
          <label className="input-label">대상 시험 선택</label>
          <select className="form-input" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
            <option value="">시험을 선택하세요</option>
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
          {examinees.length === 0 ? (
            <p className="text-muted">등록된 응시자가 없습니다. 응시자 이메일 관리 탭에서 먼저 등록해주세요.</p>
          ) : (
            examinees.map((examinee) => (
              <label key={examinee.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedExaminees.includes(examinee.id)} onChange={() => toggleExaminee(examinee.id)} />
                <span style={{ fontWeight: 'bold' }}>{examinee.name}</span>
                <span style={{ color: '#64748b' }}>{examinee.email}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>{examinee.statusText}</span>
              </label>
            ))
          )}
        </div>
        <button className="btn-primary" style={{ width: 'fit-content' }} onClick={handleAssign}>선택한 응시자 배정하기</button>
        {message && <p className="text-muted" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>
    </div>
  );
}
