import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight, Mail, UserPlus, LogIn, Building2, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '../api/client';
import { persistSession } from '../hooks/useCurrentUser';

const emptyForm = { username: '', email: '', password: '', passwordConfirm: '', orgName: '', code: '' };

export default function AuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('LOGIN'); // 'LOGIN' 또는 'SIGNUP'
  const [formData, setFormData] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 이메일 인증 상태
  const [verificationId, setVerificationId] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  const resetForm = () => {
    setFormData(emptyForm);
    setVerificationId('');
    setVerificationToken('');
  };

  const handleModeSelect = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') {
      setVerificationId('');
      setVerificationToken('');
    }
  };

  const sendVerificationCode = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!formData.email.trim()) {
      setErrorMsg('이메일을 먼저 입력해주세요.');
      return;
    }
    setSendingCode(true);
    try {
      const { data } = await api.post('/auth/email-verification/send', { email: formData.email.trim() });
      setVerificationId(data.verificationId);
      setVerificationToken('');
      setSuccessMsg(`인증번호를 보냈습니다. (미리보기: ${data.previewCode})`);
    } catch (error) {
      setErrorMsg(apiErrorMessage(error, '인증번호 발송에 실패했습니다.'));
    } finally {
      setSendingCode(false);
    }
  };

  const confirmVerificationCode = async () => {
    setErrorMsg('');
    try {
      const { data } = await api.post('/auth/email-verification/confirm', {
        email: formData.email.trim(),
        verificationId,
        code: formData.code.trim(),
      });
      setVerificationToken(data.verificationToken);
      setSuccessMsg('이메일 인증이 완료되었습니다.');
    } catch (error) {
      setErrorMsg(apiErrorMessage(error, '인증번호 확인에 실패했습니다.'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authMode === 'SIGNUP') {
      if (!formData.username || !formData.email || !formData.password || !formData.passwordConfirm || !formData.orgName) {
        setErrorMsg('모든 항목을 빠짐없이 입력해주세요.'); return;
      }
      if (formData.password !== formData.passwordConfirm) {
        setErrorMsg('비밀번호가 일치하지 않습니다.'); return;
      }
      if (!verificationToken) {
        setErrorMsg('이메일 인증을 먼저 완료해주세요.'); return;
      }
      try {
        await api.post('/auth/signup', {
          name: formData.username,
          email: formData.email,
          password: formData.password,
          orgName: formData.orgName,
          verificationToken,
        });
        setAuthMode('LOGIN');
        setFormData({ ...emptyForm, email: formData.email });
        setSuccessMsg('관리자 가입 및 조직 승인 신청이 접수되었습니다. ADMIN의 조직 승인 후 업무 화면을 이용할 수 있습니다.');
      } catch (error) {
        setErrorMsg(apiErrorMessage(error, '회원가입 중 오류가 발생했습니다.'));
      }
      return;
    }

    if (!formData.email.trim() || !formData.password.trim()) {
      setErrorMsg('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const { data } = await api.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password.trim(),
      });
      persistSession(data);

      if (data.user.role === 'ADMIN') navigate('/home?tab=ORG_APPROVAL');
      else navigate('/home?tab=' + (data.organization?.status === 'APPROVED' ? 'EXAMINEE_MGMT' : 'ORG_REQUEST'));
    } catch (error) {
      setErrorMsg(apiErrorMessage(error, '로그인 중 오류가 발생했습니다. (계정 정보를 확인하거나 관리자에게 문의하세요)'));
    }
  };

  const isSignup = authMode === 'SIGNUP';

  return (
    <div className="auth-container" style={{ minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="auth-box" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>

        {/* 상단 로고 및 타이틀 */}
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="logo-icon" style={{ width: 52, height: 52, backgroundColor: '#319795', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
            <ShieldCheck color="#ffffff" size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: 'bold' }}>관리자 및 감독관 포털</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>AI 역량 평가 플랫폼 운영진 전용 로그인</p>
        </div>

        {/* 모드 전환 탭 (로그인 / 회원가입) */}
        <div className="mode-tab-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => handleModeSelect('LOGIN')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.6rem', border: 'none', borderRadius: '8px', backgroundColor: !isSignup ? '#ffffff' : 'transparent', color: !isSignup ? '#319795' : '#64748b', fontWeight: !isSignup ? 'bold' : '500', cursor: 'pointer', boxShadow: !isSignup ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <LogIn size={16} /><span>로그인</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSelect('SIGNUP')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.6rem', border: 'none', borderRadius: '8px', backgroundColor: isSignup ? '#ffffff' : 'transparent', color: isSignup ? '#319795' : '#64748b', fontWeight: isSignup ? 'bold' : '500', cursor: 'pointer', boxShadow: isSignup ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
          >
            <UserPlus size={16} /><span>관리자 가입 및 조직 신청</span>
          </button>
        </div>

        {/* 알림 메시지 */}
        {errorMsg && <div className="alert-box alert-error" style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem' }}>{errorMsg}</div>}
        {successMsg && <div className="alert-box alert-success" style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '6px', fontSize: '0.85rem' }}>{successMsg}</div>}

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignup && (
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>이름 (실명)</label>
              <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input type="text" name="username" placeholder="홍길동" value={formData.username} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
            </div>
          )}

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>이메일</label>
            <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="text"
                  name="email"
                  placeholder="admin@aivle.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
              {isSignup && (
                <button
                  type="button"
                  onClick={sendVerificationCode}
                  disabled={sendingCode || !formData.email.trim() || Boolean(verificationToken)}
                  style={{ padding: '0.7rem 0.9rem', border: '1px solid #319795', borderRadius: '8px', backgroundColor: '#ffffff', color: '#319795', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {verificationId ? '재발송' : '인증번호 발송'}
                </button>
              )}
            </div>
          </div>

          {isSignup && verificationId && !verificationToken && (
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>인증번호</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6자리 인증번호"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  className="form-input"
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  onClick={confirmVerificationCode}
                  disabled={formData.code.length !== 6}
                  style={{ padding: '0.7rem 0.9rem', border: 'none', borderRadius: '8px', backgroundColor: '#319795', color: '#ffffff', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  확인
                </button>
              </div>
            </div>
          )}

          {isSignup && verificationToken && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> 이메일 인증 완료
            </div>
          )}

          {isSignup && (
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>소속 조직명</label>
              <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Building2 size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input type="text" name="orgName" placeholder="예: A대학교 컴퓨터공학과" value={formData.orgName} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
              <p className="text-muted" style={{ fontSize: '0.78rem', margin: '0.35rem 0 0 0' }}>입력한 조직은 ADMIN 승인 후 이 계정에 배정됩니다.</p>
            </div>
          )}

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>비밀번호</label>
            <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="password"
                name="password"
                placeholder={isSignup ? '8자 이상' : '••••••••'}
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {isSignup && (
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: '#334155' }}>비밀번호 확인</label>
              <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                <input type="password" name="passwordConfirm" placeholder="••••••••" value={formData.passwordConfirm} onChange={handleChange} className="form-input" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '0.75rem',
              padding: '0.85rem',
              backgroundColor: '#319795',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <LogIn size={16} />
            <span>{isSignup ? '관리자 가입 및 조직 신청하기' : '로그인'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
          {isSignup ? (
            <span>이미 계정이 있으신가요? 상단의 <strong>[로그인]</strong> 탭을 눌러 접속하세요.</span>
          ) : (
            <span>조직을 새로 신청하려면 상단의 <strong>[관리자 가입 및 조직 신청]</strong> 탭을 눌러주세요.</span>
          )}
        </div>
      </div>
    </div>
  );
}
