import React, { useEffect, useState } from 'react';
import { UserPlus, Upload } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

// "이름,이메일" 또는 이메일만 한 줄씩 붙여넣은 텍스트를 파싱한다.
const parseBulkText = (text) => text
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [first, second] = line.split(',').map((part) => part?.trim());
    return second ? { name: first, email: second } : { name: '', email: first };
  });

export default function ExamineeMgmtTab() {
  const [examinees, setExaminees] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [single, setSingle] = useState({ name: '', email: '' });
  const [bulkText, setBulkText] = useState('');

  const fetchExaminees = async () => {
    try {
      const { data } = await api.get('/manager/examinees', { headers: authHeaders() });
      setExaminees(data);
    } catch (error) {
      setLoadError('응시자 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchExaminees();
  }, []);

  const registerEntries = async (entries) => {
    setMessage('');
    try {
      const { data } = await api.post('/manager/examinees', { entries }, { headers: authHeaders() });
      const summary = `${data.created.length}명 등록 완료` + (data.duplicates.length > 0 ? `, 중복 ${data.duplicates.length}건 제외` : '');
      setMessage(summary);
      fetchExaminees();
    } catch (error) {
      setMessage(apiErrorMessage(error, '응시자 등록에 실패했습니다.'));
    }
  };

  const handleSingleSubmit = (event) => {
    event.preventDefault();
    if (!single.email.trim()) {
      setMessage('이메일을 입력해주세요.');
      return;
    }
    registerEntries([single]);
    setSingle({ name: '', email: '' });
  };

  const handleBulkSubmit = (event) => {
    event.preventDefault();
    const entries = parseBulkText(bulkText);
    if (entries.length === 0) {
      setMessage('일괄 등록할 이메일을 입력해주세요.');
      return;
    }
    registerEntries(entries);
    setBulkText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <UserPlus size={20} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>응시자 직접 입력</h3>
          </div>
          <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text" value={single.name} onChange={(e) => setSingle({ ...single, name: e.target.value })} placeholder="이름 (선택)" className="form-input" />
            <input type="text" value={single.email} onChange={(e) => setSingle({ ...single, email: e.target.value })} placeholder="응시자 이메일" className="form-input" />
            <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>등록하기</button>
          </form>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Upload size={20} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>응시자 이메일 일괄 등록</h3>
          </div>
          <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'한 줄에 한 명씩 입력하세요.\n홍길동,hong@aivle.com\nkim@aivle.com'}
              rows={5}
              className="form-input"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button type="submit" className="btn-primary" style={{ width: 'fit-content', backgroundColor: '#16a34a' }}>일괄 등록하기</button>
          </form>
        </div>
      </div>

      {message && <div className="alert-box" style={{ padding: '0.75rem', backgroundColor: '#eff6ff', color: '#2563EB', borderRadius: '6px' }}>{message}</div>}

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>조직 응시자 목록 ({examinees.length}명)</h3>
        {loadError && <div className="alert-box alert-error">{loadError}</div>}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '0.75rem' }}>이름</th>
                <th style={{ padding: '0.75rem' }}>이메일</th>
                <th style={{ padding: '0.75rem' }}>응시번호</th>
                <th style={{ padding: '0.75rem' }}>배정 상태</th>
              </tr>
            </thead>
            <tbody>
              {examinees.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 응시자가 없습니다.</td></tr>
              ) : (
                examinees.map((examinee) => (
                  <tr key={examinee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{examinee.name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{examinee.email}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{examinee.examNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{examinee.statusText}</td>
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
