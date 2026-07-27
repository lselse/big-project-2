import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Monitor, CheckCircle2, AlertCircle, QrCode, UserCheck, RefreshCw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ExamCheckPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const displayRef = useRef(null);

  // 초대 링크(/exam/enter)에서 응시번호 확인을 마친 응시자 정보 (없으면 비회원 미리보기로 간주)
  const examEntry = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('examEntry') ?? 'null');
    } catch (error) {
      return null;
    }
  })();

  const [idVerified, setIdVerified] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [displayReady, setDisplayReady] = useState(false);
  const [qrConnected, setQrConnected] = useState(false);

  const [qrToken, setQrToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    generateNewToken();

    // 🌟 모바일 페이지에서 보낸 연동 완료 신호 수신 리스너
    const channel = new BroadcastChannel('exam_qr_channel');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'QR_CONNECTED') {
        setQrConnected(true);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const generateNewToken = () => {
    let newToken;
    try {
      if (window.crypto && window.crypto.randomUUID) {
        newToken = window.crypto.randomUUID();
      } else {
        newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      }
    } catch (e) {
      newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    setQrToken(newToken);
    setQrConnected(false);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamReady(true);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('웹캠 및 마이크 권한을 허용해야 합니다.');
      setWebcamReady(false);
    }
  };

  const startDisplayShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (displayRef.current) displayRef.current.srcObject = stream;
      setDisplayReady(true);
      stream.getVideoTracks()[0].onended = () => setDisplayReady(false);
    } catch (err) {
      setErrorMsg('전체 모니터 화면 공유를 허용해야 합니다.');
      setDisplayReady(false);
    }
  };

  const isAllReady = idVerified && webcamReady && displayReady && qrConnected;

  return (
    <div className="container">
      <h1 className="main-title" style={{fontSize: '1.75rem', marginBottom: '0.5rem'}}>시험 사전 환경 점검</h1>
      <p className="sub-description" style={{marginBottom: '2rem'}}>
        {examEntry
          ? `${examEntry.examineeName}님 (응시번호 ${examEntry.examNumber}) · ${examEntry.examTitle}`
          : '공정하고 안정적인 테스트 응시를 위해 본인 인증, PC 장비 및 보조 카메라 연결을 확인합니다.'}
      </p>

      {errorMsg && (
        <div className="alert-box alert-error">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid">
        {/* 1번 카드: 본인 인증 */}
        <div className="card">
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <UserCheck size={20} color="#2563EB" />
              <h3 style={{margin:0, fontSize:'1.1rem'}}>1. 본인 인증 (OCR 및 얼굴 대조)</h3>
            </div>
            {idVerified && <CheckCircle2 color="#16a34a" />}
          </div>
          <div className="video-box" style={{flexDirection: 'column', gap: '10px', padding: '1rem', justifyContent: 'center', textAlign: 'center'}}>
            {idVerified ? (
              <div style={{color: '#16a34a', fontWeight: 'bold', fontSize: '0.95rem'}}>
                ✓ 신분증 OCR 및 얼굴 인식 인증 완료
              </div>
            ) : (
              <div style={{color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5'}}>
                신분증 촬영 및 정면 웹캠을 통한<br/>얼굴 일치 여부(Face Match)를 확인합니다.
              </div>
            )}
          </div>
          <button
            className="btn-primary"
            style={{width:'100%', marginTop:'auto', backgroundColor: idVerified ? '#16a34a' : '#2563EB'}}
            onClick={() => setIdVerified(!idVerified)}
          >
            {idVerified ? '인증 완료됨 (클릭시 재인증)' : '본인 인증 시작하기'}
          </button>
        </div>

        {/* 2번 카드: 웹캠 */}
        <div className="card">
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <Camera size={20} color="#2563EB" />
              <h3 style={{margin:0, fontSize:'1.1rem'}}>2. 정면 웹캠 및 마이크</h3>
            </div>
            {webcamReady && <CheckCircle2 color="#16a34a" />}
          </div>
          <div className="video-box">
            <video ref={videoRef} autoPlay playsInline muted className="video-stream" />
            {!webcamReady && <span className="video-placeholder">카메라가 연결되지 않았습니다.</span>}
          </div>
          <button className="btn-primary" style={{width:'100%', marginTop:'auto'}} onClick={startWebcam}>웹캠/마이크 연결하기</button>
        </div>

        {/* 3번 카드: 화면 공유 */}
        <div className="card">
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <Monitor size={20} color="#2563EB" />
              <h3 style={{margin:0, fontSize:'1.1rem'}}>3. PC 화면 공유</h3>
            </div>
            {displayReady && <CheckCircle2 color="#16a34a" />}
          </div>
          <div className="video-box">
            <video ref={displayRef} autoPlay playsInline muted className="video-stream" />
            {!displayReady && <span className="video-placeholder">화면 공유가 연결되지 않았습니다.</span>}
          </div>
          <button className="btn-primary" style={{width:'100%', marginTop:'auto'}} onClick={startDisplayShare}>화면 공유 권한 요청</button>
        </div>

        {/* 4번 카드: QR 연동 */}
        <div className="card">
          <div className="card-header" style={{justifyContent: 'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <QrCode size={20} color="#2563EB" />
              <h3 style={{margin:0, fontSize:'1.1rem'}}>4. 측면 보조 카메라</h3>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <button
                onClick={generateNewToken}
                title="QR 새로고침"
                style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center'}}
              >
                <RefreshCw size={16} color="#64748b" />
              </button>
              {qrConnected && <CheckCircle2 color="#16a34a" />}
            </div>
          </div>
          <div className="video-box" style={{flexDirection: 'column', gap: '10px'}}>
              {/* 🌟 주소를 /mobile/scan으로 변경 */}
              <QRCodeCanvas value={`${window.location.origin}/mobile/scan?token=${qrToken}`} size={130} />
              <span style={{fontSize: '0.75rem', color: '#64748b', textAlign: 'center', wordBreak: 'break-all', padding: '0 10px'}}>
                토큰: {qrToken ? `${qrToken.slice(0, 8)}...` : '생성 중'}
              </span>
            </div>
          <button
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: 'auto',
              // 🌟 연동 완료 시 파란색(#2563EB)으로 변경, 미완료 시 회색(#475569)
              backgroundColor: qrConnected ? '#2563EB' : '#475569'
            }}
            onClick={() => setQrConnected(!qrConnected)}
          >
            {qrConnected ? '모바일 연동 완료됨 (클릭시 해제)' : '[테스트용] 모바일 연동 완료 처리'}
          </button>
        </div>
      </div>

      {/* 하단 시작 컨트롤 바 */}
      <div className="footer-box">
        <div className="status-summary">
          <span>본인 인증: <strong className={idVerified ? 'text-success' : 'text-danger'}>{idVerified ? '완료' : '미완료'}</strong></span>
          <span>필수 장비: <strong className={webcamReady && displayReady ? 'text-success' : 'text-danger'}>{webcamReady && displayReady ? '정상' : '미완료'}</strong></span>
          <span>보조 카메라: <strong className={qrConnected ? 'text-success' : 'text-danger'}>{qrConnected ? '연결됨' : '대기중'}</strong></span>
        </div>

        <button
          className="btn-primary"
          disabled={!isAllReady}
          onClick={() => navigate('/exam/session')}
        >
          {isAllReady ? '코딩 테스트 응시 시작' : '모든 점검 항목을 완료해주세요'}
        </button>
      </div>
    </div>
  );
}