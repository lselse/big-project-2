import React, { useEffect, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

export default function TeamTab() {
  const [teammates, setTeammates] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const fetchTeammates = async () => {
    try {
      const { data } = await api.get('/manager/teammates', { headers: authHeaders() });
      setTeammates(data);
    } catch (error) {
      setLoadError('관리자 인원 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    fetchTeammates();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!formData.name || !formData.email || !formData.password) {
      setMessage('이름, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }
    try {
      await api.post('/manager/teammates', formData, { headers: authHeaders() });
      setFormData({ name: '', email: '', password: '' });
      setMessage('관리자 계정이 추가되었습니다. 같은 이메일/비밀번호로 로그인할 수 있습니다.');
      fetchTeammates();
    } catch (error) {
      setMessage(apiErrorMessage(error, '관리자 인원 추가에 실패했습니다.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>관리자 인원 추가</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>같은 조직을 함께 관리할 관리자 계정을 이메일(아이디)로 추가합니다.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">이름</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="홍길동" className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">이메일(아이디)</label>
            <input type="text" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="teammate@aivle.com" className="form-input" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">임시 비밀번호</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="form-input" />
          </div>
          <button type="submit" className="btn-primary">추가하기</button>
        </form>
        {message && <p className="text-muted" style={{ marginTop: '1rem' }}>{message}</p>}
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Users size={24} color="#2563EB" />
          <h2 className="card-title" style={{ margin: 0 }}>소속 관리자 목록</h2>
        </div>
        {loadError && <div className="alert-box alert-error">{loadError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teammates.map((teammate) => (
            <div key={teammate.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.9rem 1.1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 'bold' }}>{teammate.name}</span>
              <span style={{ color: '#64748b' }}>{teammate.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
