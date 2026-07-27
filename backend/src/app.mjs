import express from "express";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createStore, verifyPassword } from "./store.mjs";

const roles = new Set(["ADMIN", "MANAGER"]);
const isNonEmptyText = (value) => typeof value === "string" && value.trim().length > 0;
const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;
const publicUser = ({ password, passwordHash, ...user }) => user;
const normalizeEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const verificationCodeHash = (code) => createHash("sha256").update(code).digest("hex");
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const verificationTtlMs = 10 * 60 * 1000; // 인증번호 유효시간 10분
const verificationCooldownMs = 60 * 1000; // 재발송 대기시간 1분
const maxVerificationAttempts = 5;
const loginLockoutMs = 15 * 60 * 1000; // 잠금 15분
const loginFailureLimit = 5; // 5회 실패 시 잠금

const withOrgInfo = (store) => (user) => {
  const organization = user.orgId ? store.organizations.find((org) => org.id === user.orgId) : null;
  return { ...publicUser(user), orgName: organization?.name ?? null, orgStatus: organization?.status ?? null };
};

const INVITATION_TTL_MS = 1000 * 60 * 60 * 72; // 72시간 후 만료되는 일회성 초대 링크

export const createApp = async ({ databasePath = resolve("data/database.json") } = {}) => {
  const store = await createStore(databasePath);
  const sessions = new Map(); // token -> userId
  const loginFailures = new Map(); // "ip:email" -> { failures, blockedUntil }
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") return response.sendStatus(204);
    return next();
  });

  // ---------------------------------------------------------------------
  // 인증/인가 미들웨어
  // ---------------------------------------------------------------------
  const authenticate = (request, response, next) => {
    const token = request.header("authorization")?.replace("Bearer ", "");
    const userId = token ? sessions.get(token) : undefined;
    const user = userId ? store.users.find((candidate) => candidate.id === userId) : undefined;
    if (!user) return response.status(401).json({ message: "로그인이 필요합니다." });
    request.user = user;
    return next();
  };

  const requireRole = (role) => (request, response, next) => {
    if (request.user.role !== role) return response.status(403).json({ message: "권한이 없습니다." });
    return next();
  };

  // 배정된 조직이 APPROVED 상태인 관리자만 조직 업무 API에 접근할 수 있다.
  const requireApprovedOrg = (request, response, next) => {
    if (request.user.role !== "MANAGER") return response.status(403).json({ message: "관리자 권한이 필요합니다." });
    if (!request.user.orgId) return response.status(403).json({ message: "아직 배정된 조직이 없습니다. ADMIN의 조직 승인 및 배정을 기다려주세요." });
    const organization = store.organizations.find((org) => org.id === request.user.orgId);
    if (!organization || organization.status !== "APPROVED") {
      return response.status(403).json({ message: "소속 조직이 승인된 상태가 아닙니다." });
    }
    request.organization = organization;
    return next();
  };

  // ---------------------------------------------------------------------
  // 공개 API
  // ---------------------------------------------------------------------
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/api/exams", (_request, response) => response.json(store.exams));
  app.get("/api/notices", (_request, response) => response.json(store.notices));

  // ---------------------------------------------------------------------
  // 0. 회원가입 이메일 인증 (가입 전 이메일 소유 확인)
  // ---------------------------------------------------------------------
  app.post("/api/auth/email-verification/send", async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      if (!isValidEmail(email)) return response.status(400).json({ message: "올바른 이메일 주소를 입력해주세요." });
      if (store.users.some((user) => user.email === email)) {
        return response.status(409).json({ message: "이미 등록된 이메일입니다." });
      }
      const previous = store.emailVerifications.find((item) => item.email === email && !item.verifiedAt);
      if (previous && Date.now() - new Date(previous.sentAt).getTime() < verificationCooldownMs) {
        return response.status(429).json({ message: "인증번호는 1분 후 다시 요청할 수 있습니다." });
      }
      const code = String(randomInt(100000, 1000000));
      const verification = {
        id: randomUUID(),
        email,
        codeHash: verificationCodeHash(code),
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + verificationTtlMs).toISOString(),
        attempts: 0,
        verifiedAt: null,
        verificationTokenHash: null
      };
      await store.addEmailVerification(verification);
      // 실제 메일 발송 연동 전까지는 인증번호를 응답에 함께 내려준다 (개발/테스트용 미리보기).
      return response.status(201).json({ verificationId: verification.id, expiresAt: verification.expiresAt, previewCode: code });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/email-verification/confirm", async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      const verificationId = typeof request.body.verificationId === "string" ? request.body.verificationId : "";
      const code = typeof request.body.code === "string" ? request.body.code.trim() : "";
      const verification = store.emailVerifications.find((item) => item.id === verificationId && item.email === email && !item.verifiedAt);
      if (!verification || new Date(verification.expiresAt) <= new Date()) {
        return response.status(410).json({ message: "인증번호가 만료되었습니다. 다시 요청해주세요." });
      }
      if (verification.attempts >= maxVerificationAttempts) {
        return response.status(429).json({ message: "인증번호 입력 횟수를 초과했습니다. 다시 요청해주세요." });
      }
      if (!/^\d{6}$/.test(code) || verificationCodeHash(code) !== verification.codeHash) {
        const attempts = verification.attempts + 1;
        await store.updateEmailVerification(verification.id, { attempts });
        return response.status(401).json({ message: `인증번호가 올바르지 않습니다. (${maxVerificationAttempts - attempts}회 남음)` });
      }
      const verificationToken = randomUUID();
      await store.updateEmailVerification(verification.id, { verifiedAt: new Date().toISOString(), verificationTokenHash: hashToken(verificationToken) });
      return response.json({ verificationToken, email });
    } catch (error) {
      return next(error);
    }
  });

  // ---------------------------------------------------------------------
  // 1. 관리자(조직 담당자) 계정 가입 신청 + 조직 생성 요청
  // ---------------------------------------------------------------------
  app.post("/api/auth/signup", async (request, response, next) => {
    try {
      const { name, password, orgName, verificationToken } = request.body;
      const normalizedEmail = normalizeEmail(request.body.email);
      if (![name, normalizedEmail, password, orgName].every(isNonEmptyText)) {
        return response.status(400).json({ message: "이름, 이메일, 비밀번호, 조직명을 모두 입력해주세요." });
      }

      const verification = store.emailVerifications.find((item) => item.email === normalizedEmail && item.verifiedAt
        && item.verificationTokenHash === hashToken(typeof verificationToken === "string" ? verificationToken : ""));
      if (!verification || new Date(verification.expiresAt) <= new Date()) {
        return response.status(400).json({ message: "이메일 인증을 먼저 완료해주세요." });
      }

      if (store.users.some((user) => user.email === normalizedEmail)) {
        return response.status(409).json({ message: "이미 등록된 이메일입니다." });
      }

      // 응시자는 회원가입하지 않으며, ADMIN 계정은 ADMIN이 직접 발급한다.
      // 자가 가입은 관리자(조직 담당자) 계정만 허용되고, 가입과 동시에 조직 승인을 요청한다.
      const user = {
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        password,
        role: "MANAGER",
        orgId: null
      };
      const organization = {
        id: randomUUID(),
        name: orgName.trim(),
        status: "PENDING",
        requestedBy: user.id,
        createdAt: new Date().toISOString(),
        decidedAt: null
      };

      const createdUser = await store.addUser(user);
      await store.addOrganization(organization);
      await store.updateEmailVerification(verification.id, { consumedAt: new Date().toISOString() });

      return response.status(201).json({ user: publicUser(createdUser), organization });
    } catch (error) {
      return next(error);
    }
  });

  // ---------------------------------------------------------------------
  // 2. 로그인 (ADMIN / MANAGER 공용 단일 폼) — 5회 연속 실패 시 15분간 잠금
  // 이메일은 계정마다 고유하므로 역할은 계정 정보에서 그대로 가져온다 (별도 역할 선택 불필요).
  // ---------------------------------------------------------------------
  app.post("/api/auth/login", async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body.email);
      const { password } = request.body;

      const key = `${request.ip}:${email}`;
      const lock = loginFailures.get(key);
      if (lock?.blockedUntil && lock.blockedUntil > Date.now()) {
        return response.status(429).json({ message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." });
      }

      const user = store.users.find((candidate) => candidate.email === email);
      if (!user || !roles.has(user.role) || !(await verifyPassword(password ?? "", user.passwordHash))) {
        const failures = (loginFailures.get(key)?.failures ?? 0) + 1;
        loginFailures.set(key, { failures, blockedUntil: failures >= loginFailureLimit ? Date.now() + loginLockoutMs : 0 });
        return response.status(401).json({ message: "이메일 또는 비밀번호를 확인해주세요." });
      }

      loginFailures.delete(key);
      const token = randomUUID();
      sessions.set(token, user.id);
      const organization = user.orgId ? store.organizations.find((org) => org.id === user.orgId) ?? null : null;
      return response.json({ token, user: publicUser(user), organization });
    } catch (error) {
      return next(error);
    }
  });

  // 새로고침 없이도 조직 승인/배정 결과를 반영할 수 있도록 현재 로그인 정보를 다시 조회한다.
  app.get("/api/auth/me", authenticate, (request, response) => {
    const organization = request.user.orgId ? store.organizations.find((org) => org.id === request.user.orgId) ?? null : null;
    return response.json({ user: publicUser(request.user), organization });
  });

  // =======================================================================
  // ADMIN: 조직 승인 및 배정
  // =======================================================================
  app.get("/api/admin/organizations", authenticate, requireRole("ADMIN"), (request, response) => {
    const { status } = request.query;
    const organizations = status ? store.organizations.filter((org) => org.status === status) : store.organizations;
    response.json(organizations);
  });

  const changeOrgStatus = (fromStatuses, toStatus) => async (request, response, next) => {
    try {
      const organization = store.organizations.find((org) => org.id === request.params.id);
      if (!organization) return response.status(404).json({ message: "조직을 찾을 수 없습니다." });
      if (!fromStatuses.includes(organization.status)) {
        return response.status(409).json({ message: `현재 상태(${organization.status})에서는 처리할 수 없습니다.` });
      }
      const updated = await store.updateOrganization(organization.id, { status: toStatus, decidedAt: new Date().toISOString() });
      return response.json({ message: "조직 상태가 변경되었습니다.", organization: updated });
    } catch (error) {
      return next(error);
    }
  };

  app.put("/api/admin/organizations/:id/approve", authenticate, requireRole("ADMIN"), changeOrgStatus(["PENDING", "REJECTED"], "APPROVED"));
  app.put("/api/admin/organizations/:id/reject", authenticate, requireRole("ADMIN"), changeOrgStatus(["PENDING"], "REJECTED"));
  app.put("/api/admin/organizations/:id/suspend", authenticate, requireRole("ADMIN"), changeOrgStatus(["APPROVED"], "SUSPENDED"));
  app.put("/api/admin/organizations/:id/reactivate", authenticate, requireRole("ADMIN"), changeOrgStatus(["SUSPENDED"], "APPROVED"));

  // =======================================================================
  // ADMIN: 관리자(조직 담당자) 계정 관리
  // =======================================================================
  app.get("/api/admin/managers", authenticate, requireRole("ADMIN"), (_request, response) => {
    response.json(store.users.filter((user) => user.role === "MANAGER").map(withOrgInfo(store)));
  });

  // ADMIN이 조직 배정 없이 관리자 계정을 직접 생성한다.
  app.post("/api/admin/managers", authenticate, requireRole("ADMIN"), async (request, response, next) => {
    try {
      const { name, email, password } = request.body;
      if (![name, email, password].every(isNonEmptyText)) {
        return response.status(400).json({ message: "이름, 이메일, 비밀번호를 입력해주세요." });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (store.users.some((user) => user.email === normalizedEmail)) {
        return response.status(409).json({ message: "이미 등록된 이메일입니다." });
      }
      const createdUser = await store.addUser({
        id: randomUUID(), name: name.trim(), email: normalizedEmail, password, role: "MANAGER", orgId: null
      });
      return response.status(201).json({ user: withOrgInfo(store)(createdUser) });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/admin/managers/:id/assign-org", authenticate, requireRole("ADMIN"), async (request, response, next) => {
    try {
      const manager = store.users.find((candidate) => candidate.id === request.params.id && candidate.role === "MANAGER");
      if (!manager) return response.status(404).json({ message: "관리자 계정을 찾을 수 없습니다." });

      const organization = store.organizations.find((org) => org.id === request.body.orgId);
      if (!organization) return response.status(404).json({ message: "조직을 찾을 수 없습니다." });
      if (organization.status !== "APPROVED") return response.status(409).json({ message: "승인된 조직만 배정할 수 있습니다." });

      const updated = await store.updateUser(manager.id, { orgId: organization.id });
      return response.json({ message: "조직이 배정되었습니다.", user: withOrgInfo(store)(updated) });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/admin/managers/:id/unassign-org", authenticate, requireRole("ADMIN"), async (request, response, next) => {
    try {
      const manager = store.users.find((candidate) => candidate.id === request.params.id && candidate.role === "MANAGER");
      if (!manager) return response.status(404).json({ message: "관리자 계정을 찾을 수 없습니다." });
      const updated = await store.updateUser(manager.id, { orgId: null });
      return response.json({ message: "조직 배정이 해제되었습니다.", user: withOrgInfo(store)(updated) });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // ADMIN: 전체 조직/시험/응시자 통합 조회 및 통계
  // =======================================================================
  app.get("/api/admin/exams", authenticate, requireRole("ADMIN"), (_request, response) => {
    const withOrgName = store.exams.map((exam) => ({
      ...exam,
      orgName: store.organizations.find((org) => org.id === exam.orgId)?.name ?? "미상"
    }));
    response.json(withOrgName);
  });

  app.get("/api/admin/examinees", authenticate, requireRole("ADMIN"), (_request, response) => {
    const withOrgName = store.examinees.map((examinee) => ({
      ...examinee,
      orgName: store.organizations.find((org) => org.id === examinee.orgId)?.name ?? "미상"
    }));
    response.json(withOrgName);
  });

  app.get("/api/admin/overview", authenticate, requireRole("ADMIN"), (_request, response) => {
    const countBy = (list, key) => list.reduce((accumulator, item) => ({
      ...accumulator, [item[key]]: (accumulator[item[key]] ?? 0) + 1
    }), {});
    response.json({
      organizations: { total: store.organizations.length, ...countBy(store.organizations, "status") },
      managers: store.users.filter((user) => user.role === "MANAGER").length,
      exams: store.exams.length,
      examinees: store.examinees.length,
      warnings: store.warnings.length
    });
  });

  // =======================================================================
  // ADMIN: 전체 시스템 정책 및 LLM/AI 분석 설정
  // =======================================================================
  app.get("/api/admin/system-policy", authenticate, requireRole("ADMIN"), (_request, response) => {
    response.json(store.systemPolicy);
  });

  app.put("/api/admin/system-policy", authenticate, requireRole("ADMIN"), async (request, response, next) => {
    try {
      const { selfSignupEnabled, orgApprovalRequired, inviteLinkExpiryHours, dataRetentionDays } = request.body;
      const patch = {
        ...(typeof selfSignupEnabled === "boolean" ? { selfSignupEnabled } : {}),
        ...(typeof orgApprovalRequired === "boolean" ? { orgApprovalRequired } : {}),
        ...(Number.isFinite(Number(inviteLinkExpiryHours)) ? { inviteLinkExpiryHours: Number(inviteLinkExpiryHours) } : {}),
        ...(Number.isFinite(Number(dataRetentionDays)) ? { dataRetentionDays: Number(dataRetentionDays) } : {}),
        updatedAt: new Date().toISOString()
      };
      const systemPolicy = await store.updateSystemPolicy(patch);
      return response.json({ message: "시스템 정책이 저장되었습니다.", systemPolicy });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/ai-config", authenticate, requireRole("ADMIN"), (_request, response) => {
    response.json(store.aiConfig);
  });

  app.put("/api/admin/ai-config", authenticate, requireRole("ADMIN"), async (request, response, next) => {
    try {
      const { model, webcamSensitivity } = request.body;
      if (!isNonEmptyText(model)) return response.status(400).json({ message: "LLM 모델을 선택해주세요." });
      const sensitivity = Number(webcamSensitivity);
      if (!Number.isFinite(sensitivity) || sensitivity < 1 || sensitivity > 100) {
        return response.status(400).json({ message: "웹캠 감독 민감도는 1~100 사이여야 합니다." });
      }
      const aiConfig = await store.updateAiConfig({ model: model.trim(), webcamSensitivity: sensitivity, updatedAt: new Date().toISOString() });
      return response.json({ message: "AI 분석 설정이 저장되었습니다.", aiConfig });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 조직 신청 (아직 승인된 조직이 없는 관리자)
  // =======================================================================
  app.get("/api/manager/organization", authenticate, requireRole("MANAGER"), (request, response) => {
    if (request.user.orgId) {
      const organization = store.organizations.find((org) => org.id === request.user.orgId) ?? null;
      return response.json({ organization, assigned: true });
    }
    const latestRequest = store.organizations
      .filter((org) => org.requestedBy === request.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null;
    // 조직 status가 APPROVED여도 ADMIN이 아직 이 계정에 배정(assign-org)하지 않았다면 업무 화면 접근은 불가하다.
    return response.json({ organization: latestRequest, assigned: false });
  });

  app.post("/api/manager/organization-requests", authenticate, requireRole("MANAGER"), async (request, response, next) => {
    try {
      if (request.user.orgId) return response.status(409).json({ message: "이미 배정된 조직이 있습니다." });
      const { orgName } = request.body;
      if (!isNonEmptyText(orgName)) return response.status(400).json({ message: "조직명을 입력해주세요." });

      const hasPendingRequest = store.organizations.some((org) => org.requestedBy === request.user.id && org.status === "PENDING");
      if (hasPendingRequest) return response.status(409).json({ message: "이미 승인 대기 중인 조직 신청이 있습니다." });

      const organization = {
        id: randomUUID(), name: orgName.trim(), status: "PENDING",
        requestedBy: request.user.id, createdAt: new Date().toISOString(), decidedAt: null
      };
      await store.addOrganization(organization);
      return response.status(201).json({ organization });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 관리자 인원 추가 (동일 조직에 관리자 계정 추가)
  // =======================================================================
  app.get("/api/manager/teammates", authenticate, requireApprovedOrg, (request, response) => {
    const teammates = store.users
      .filter((user) => user.role === "MANAGER" && user.orgId === request.organization.id)
      .map(publicUser);
    response.json(teammates);
  });

  app.post("/api/manager/teammates", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const { name, email, password } = request.body;
      if (![name, email, password].every(isNonEmptyText)) {
        return response.status(400).json({ message: "이름, 이메일, 비밀번호를 입력해주세요." });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (store.users.some((user) => user.email === normalizedEmail)) {
        return response.status(409).json({ message: "이미 등록된 이메일입니다." });
      }
      const createdUser = await store.addUser({
        id: randomUUID(), name: name.trim(), email: normalizedEmail, password, role: "MANAGER", orgId: request.organization.id
      });
      return response.status(201).json({ user: publicUser(createdUser) });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 조직별 응시자 이메일 등록 (직접 입력 및 일괄 등록)
  // =======================================================================
  app.get("/api/manager/examinees", authenticate, requireApprovedOrg, (request, response) => {
    response.json(store.examinees.filter((examinee) => examinee.orgId === request.organization.id));
  });

  app.post("/api/manager/examinees", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const { entries } = request.body;
      if (!isNonEmptyArray(entries)) return response.status(400).json({ message: "등록할 응시자 정보를 입력해주세요." });

      const cleaned = entries
        .map((entry) => ({ name: entry?.name?.trim() ?? "", email: entry?.email?.trim().toLowerCase() ?? "" }))
        .filter((entry) => isNonEmptyText(entry.email));

      if (cleaned.length === 0) return response.status(400).json({ message: "유효한 이메일이 없습니다." });

      const existingEmails = new Set(store.examinees.filter((ex) => ex.orgId === request.organization.id).map((ex) => ex.email));
      const duplicates = cleaned.filter((entry) => existingEmails.has(entry.email));
      const toCreate = cleaned.filter((entry) => !existingEmails.has(entry.email));

      const created = toCreate.map((entry) => ({
        id: randomUUID(),
        orgId: request.organization.id,
        examId: null,
        name: entry.name || entry.email.split("@")[0],
        email: entry.email,
        examNumber: String(Math.floor(10000000 + Math.random() * 90000000)),
        status: "REGISTERED",
        statusText: "시험 대상자 배정 대기",
        currentProb: "-",
        invitedAt: null
      }));

      if (created.length > 0) await store.addExaminees(created);
      return response.status(201).json({ created, duplicates: duplicates.map((entry) => entry.email) });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 시험 생성 및 일정 관리 + 시험 대상자 배정
  // =======================================================================
  app.get("/api/manager/exams", authenticate, requireApprovedOrg, (request, response) => {
    response.json(store.exams.filter((exam) => exam.orgId === request.organization.id));
  });

  app.post("/api/manager/exams", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const { title, duration, questions, date } = request.body;
      if (![title, duration, questions].every(isNonEmptyText)) {
        return response.status(400).json({ message: "시험명, 제한 시간, 문항 수를 입력해주세요." });
      }
      const exam = {
        id: randomUUID(),
        orgId: request.organization.id,
        title: title.trim(),
        duration: duration.trim(),
        questions: questions.trim(),
        category: "정규 평가",
        status: "AVAILABLE",
        date: isNonEmptyText(date) ? date.trim() : "일정 미정"
      };
      await store.addExam(exam);
      return response.status(201).json(exam);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/manager/exams/:examId/assignees", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const exam = store.exams.find((candidate) => candidate.id === request.params.examId && candidate.orgId === request.organization.id);
      if (!exam) return response.status(404).json({ message: "시험을 찾을 수 없습니다." });

      const { examineeIds } = request.body;
      if (!isNonEmptyArray(examineeIds)) return response.status(400).json({ message: "배정할 응시자를 선택해주세요." });

      const assigned = [];
      for (const examineeId of examineeIds) {
        const examinee = store.examinees.find((candidate) => candidate.id === examineeId && candidate.orgId === request.organization.id);
        if (!examinee) continue;
        await store.updateExaminee(examinee.id, { examId: exam.id, statusText: "초대 메일 발송 대기" });
        assigned.push(examinee.id);
      }
      return response.json({ message: `${assigned.length}명의 응시자를 시험 대상자로 배정했습니다.`, assigned });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 시험 초대 메일 일괄 발송
  // =======================================================================
  app.post("/api/manager/exams/:examId/invitations", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const exam = store.exams.find((candidate) => candidate.id === request.params.examId && candidate.orgId === request.organization.id);
      if (!exam) return response.status(404).json({ message: "시험을 찾을 수 없습니다." });

      const targets = store.examinees.filter((examinee) => examinee.orgId === request.organization.id && examinee.examId === exam.id);
      if (targets.length === 0) return response.status(400).json({ message: "이 시험에 배정된 응시자가 없습니다." });

      const now = new Date();
      const ttlMs = (store.systemPolicy.inviteLinkExpiryHours ?? 72) * 60 * 60 * 1000;
      const expiresAt = new Date(now.getTime() + (Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : INVITATION_TTL_MS)).toISOString();
      const invitations = targets.map((examinee) => ({
        id: randomUUID(),
        examId: exam.id,
        examineeId: examinee.id,
        token: randomUUID(),
        sentAt: now.toISOString(),
        expiresAt
      }));

      await store.addInvitations(invitations);
      for (const examinee of targets) {
        await store.updateExaminee(examinee.id, { invitedAt: now.toISOString(), statusText: "초대 메일 발송 완료" });
      }

      return response.status(201).json({ message: `${invitations.length}건의 초대 메일을 발송했습니다.`, invitations });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/manager/exams/:examId/invitations", authenticate, requireApprovedOrg, (request, response) => {
    const invitations = store.invitations.filter((invitation) => invitation.examId === request.params.examId);
    response.json(invitations);
  });

  // =======================================================================
  // MANAGER: 실시간 응시 현황, 이상 행동 확인, 경고 발송
  // =======================================================================
  app.post("/api/manager/examinees/:id/warnings", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const examinee = store.examinees.find((candidate) => candidate.id === request.params.id && candidate.orgId === request.organization.id);
      if (!examinee || !isNonEmptyText(request.body.message)) return response.status(400).json({ message: "경고 대상을 확인해주세요." });
      await store.addWarning({ id: randomUUID(), examineeId: examinee.id, message: request.body.message.trim(), createdAt: new Date().toISOString() });
      return response.status(201).json({ message: "경고를 전송했습니다." });
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // MANAGER: 시험·문제·부정행위 정책 관리 (조직 범위)
  // =======================================================================
  app.get("/api/manager/policy", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const policy = await store.getOrgPolicy(request.organization.id);
      return response.json(policy);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/manager/policy/problems", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const { title, points, languages } = request.body;
      if (!isNonEmptyText(title)) return response.status(400).json({ message: "문제 제목을 입력해주세요." });
      const problem = {
        id: randomUUID(),
        title: title.trim(),
        points: Number.isFinite(Number(points)) ? Number(points) : 25,
        languages: isNonEmptyText(languages) ? languages.trim() : "Python3"
      };
      const policy = await store.addPolicyProblem(request.organization.id, problem);
      return response.status(201).json(policy);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/manager/policy/cheat-rules", authenticate, requireApprovedOrg, async (request, response, next) => {
    try {
      const { rules } = request.body;
      if (!isNonEmptyArray(rules)) return response.status(400).json({ message: "저장할 부정행위 정책을 선택해주세요." });
      const policy = await store.updatePolicyCheatRules(request.organization.id, rules);
      return response.json(policy);
    } catch (error) {
      return next(error);
    }
  });

  // =======================================================================
  // 응시자: 초대 메일 링크 기반 시험 입장 (회원가입/로그인 없이 토큰 + 응시번호로 확인)
  // =======================================================================
  app.get("/api/exam-entry/:token", (request, response) => {
    const invitation = store.invitations.find((candidate) => candidate.token === request.params.token);
    if (!invitation) return response.status(404).json({ message: "유효하지 않은 초대 링크입니다." });
    if (new Date(invitation.expiresAt) < new Date()) return response.status(410).json({ message: "초대 링크가 만료되었습니다. 관리자에게 재발송을 요청해주세요." });

    const exam = store.exams.find((candidate) => candidate.id === invitation.examId);
    if (!exam) return response.status(404).json({ message: "시험 정보를 찾을 수 없습니다." });
    const organization = store.organizations.find((candidate) => candidate.id === exam.orgId);

    return response.json({
      exam: { title: exam.title, date: exam.date, duration: exam.duration, questions: exam.questions },
      organization: { name: organization?.name ?? "" },
      expiresAt: invitation.expiresAt
    });
  });

  app.post("/api/exam-entry/:token/verify", async (request, response, next) => {
    try {
      const invitation = store.invitations.find((candidate) => candidate.token === request.params.token);
      if (!invitation) return response.status(404).json({ message: "유효하지 않은 초대 링크입니다." });
      if (new Date(invitation.expiresAt) < new Date()) return response.status(410).json({ message: "초대 링크가 만료되었습니다. 관리자에게 재발송을 요청해주세요." });

      if (!isNonEmptyText(request.body.examNumber)) {
        return response.status(400).json({ message: "응시번호를 입력해주세요." });
      }

      const examinee = store.examinees.find((candidate) => candidate.id === invitation.examineeId);
      const exam = store.exams.find((candidate) => candidate.id === invitation.examId);
      if (!examinee || !exam) return response.status(404).json({ message: "시험 정보를 찾을 수 없습니다." });
      if (examinee.examNumber !== request.body.examNumber.trim()) {
        return response.status(401).json({ message: "응시번호가 일치하지 않습니다. 초대 메일을 다시 확인해주세요." });
      }

      await store.updateExaminee(examinee.id, { status: "NORMAL", statusText: "입장 완료 · 사전 점검 대기" });
      return response.json({
        examinee: { name: examinee.name, examNumber: examinee.examNumber },
        exam: { id: exam.id, title: exam.title }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ message: "서버 오류가 발생했습니다." });
  });
  return app;
};
