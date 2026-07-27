export const seedData = {
  users: [
    { id: "user-admin", name: "플랫폼관리자", email: "admin@aivle.com", role: "ADMIN", password: "123", orgId: null },
    { id: "user-manager-1", name: "김관리자", email: "manager@aivle.com", role: "MANAGER", password: "123", orgId: "org-cs" },
    { id: "user-manager-2", name: "이관리자", email: "manager2@aivle.com", role: "MANAGER", password: "123", orgId: "org-cs" },
    { id: "user-manager-pending", name: "박관리자", email: "pending-manager@aivle.com", role: "MANAGER", password: "123", orgId: null }
  ],
  organizations: [
    {
      id: "org-cs",
      name: "A대학교 컴퓨터공학과",
      status: "APPROVED",
      requestedBy: "user-manager-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      decidedAt: "2026-06-03T00:00:00.000Z"
    },
    {
      id: "org-ie",
      name: "B대학교 산업경영공학과",
      status: "PENDING",
      requestedBy: "user-manager-pending",
      createdAt: "2026-07-20T00:00:00.000Z",
      decidedAt: null
    }
  ],
  exams: [
    {
      id: "exam-2026-second-half",
      orgId: "org-cs",
      title: "2026년 하반기 신입 공채 AI 리터러시 역량 평가",
      category: "정규 평가 (Python / Java / C++)",
      duration: "90분",
      questions: "총 4문제",
      status: "AVAILABLE",
      date: "2026.07.20 ~ 2026.07.22"
    }
  ],
  notices: [
    { id: "notice-browser", title: "[필수 독려] 시험 응시 전 PC 크롬(Chrome) 브라우저 최신 업데이트 안내", date: "2026.07.18" },
    { id: "notice-camera", title: "보조 카메라(스마트폰) 거치 각도 및 QR 연결 가이드라인", date: "2026.07.15" }
  ],
  examinees: [
    { id: "examinee-1", orgId: "org-cs", examId: "exam-2026-second-half", name: "김응시", email: "applicant1@aivle.com", examNumber: "20260001", status: "NORMAL", statusText: "정상 응시 중", currentProb: "문제 2번", invitedAt: "2026-07-19T00:00:00.000Z" },
    { id: "examinee-2", orgId: "org-cs", examId: "exam-2026-second-half", name: "이수험", email: "applicant2@aivle.com", examNumber: "20260002", status: "WARNING", statusText: "시선 이탈 감지", currentProb: "문제 1번", invitedAt: "2026-07-19T00:00:00.000Z" },
    { id: "examinee-3", orgId: "org-cs", examId: "exam-2026-second-half", name: "박개발", email: "applicant3@aivle.com", examNumber: "20260003", status: "DANGER", statusText: "이어폰 착용 의심", currentProb: "문제 3번", invitedAt: "2026-07-19T00:00:00.000Z" },
    { id: "examinee-4", orgId: "org-cs", examId: "exam-2026-second-half", name: "최코딩", email: "applicant4@aivle.com", examNumber: "20260004", status: "NORMAL", statusText: "정상 응시 중", currentProb: "문제 4번 제출완료", invitedAt: "2026-07-19T00:00:00.000Z" }
  ],
  invitations: [],
  warnings: [],
  emailVerifications: [],
  orgPolicies: [
    {
      orgId: "org-cs",
      problems: [
        { id: "problem-1", title: "LLM 기반 코드 리팩토링 및 성능 검증", points: 25, languages: "Python3, Java17" }
      ],
      cheatRules: [
        { id: "rule-eye-tracking", label: "웹캠 시선 이탈 3회 이상 감지 시 자동 경고 발송", enabled: true },
        { id: "rule-earphone", label: "이어폰 및 헤드셋 착용 탐지 시 즉시 부정행위 로그 기록", enabled: true },
        { id: "rule-tab-switch", label: "브라우저 전체 화면 이탈(Tab Switch) 시 시험 강제 제출", enabled: true }
      ]
    }
  ],
  systemPolicy: {
    selfSignupEnabled: true,
    orgApprovalRequired: true,
    inviteLinkExpiryHours: 72,
    dataRetentionDays: 365,
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  aiConfig: {
    model: "GPT-4o (고성능 시멘틱 코드 리뷰)",
    webcamSensitivity: 75,
    updatedAt: "2026-06-01T00:00:00.000Z"
  }
};
