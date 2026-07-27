import React, { useEffect, useState } from 'react';
import { Cpu, Settings } from 'lucide-react';
import { api, apiErrorMessage, authHeaders } from '../api/client';

const MODEL_OPTIONS = [
  'GPT-4o (고성능 시멘틱 코드 리뷰)',
  'Claude 3.5 Sonnet (엄격한 문법 및 효율성 검증)'
];

export default function AiConfigTab() {
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/ai-config', { headers: authHeaders() })
      .then(({ data }) => setConfig(data))
      .catch(() => setLoadError('AI 설정을 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'));
  }, []);

  const handleSave = async () => {
    setMessage('');
    try {
      const { data } = await api.put('/admin/ai-config', config, { headers: authHeaders() });
      setConfig(data.aiConfig);
      setMessage('AI 분석 설정이 반영되었습니다.');
    } catch (error) {
      setMessage(apiErrorMessage(error, '설정 저장에 실패했습니다.'));
    }
  };

  if (loadError) return <div className="alert-box alert-error">{loadError}</div>;
  if (!config) return null;

  return (
    <div className="card" style={{ padding: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: '#f5f3ff', borderRadius: '10px', color: '#7c3aed' }}>
          <Cpu size={24} />
        </div>
        <div>
          <h2 className="card-title" style={{ margin: 0 }}>LLM 및 AI 분석 설정</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>코드 자동 채점을 위한 LLM 파이프라인 및 화상 감시 모델 민감도를 조절합니다. (플랫폼 전체 공통 적용)</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
        <div className="input-group">
          <label className="input-label">코드 자동 채점 LLM 모델 선택</label>
          <select className="form-input" value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })}>
            {MODEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">웹캠 AI 감독 민감도 (Threshold)</label>
          <input type="range" min="1" max="100" value={config.webcamSensitivity} onChange={(e) => setConfig({ ...config, webcamSensitivity: Number(e.target.value) })} className="form-input" style={{ padding: 0 }} />
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>현재 설정값: {config.webcamSensitivity}%</span>
        </div>
        <button className="btn-primary" style={{ width: 'fit-content', marginTop: '1rem' }} onClick={handleSave}>
          <Settings size={16} style={{ marginRight: '6px' }} /> 설정 적용
        </button>
        {message && <p className="text-muted" style={{ margin: 0 }}>{message}</p>}
      </div>
    </div>
  );
}
