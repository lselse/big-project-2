import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApp } from "../src/app.mjs";
import { createStore } from "../src/store.mjs";

const startServer = async () => {
  const directory = await mkdtemp(join(tmpdir(), "aivle-api-"));
  const app = await createApp({ databasePath: join(directory, "database.json") });
  const server = app.listen(0);
  await new Promise((resolveReady) => server.once("listening", resolveReady));
  const address = server.address();
  return { baseUrl: `http://127.0.0.1:${address.port}`, directory, server };
};

const asJson = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const withAuth = (token, options = {}) => ({
  ...options,
  headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` }
});

const verifyEmail = async (baseUrl, email) => {
  const send = await fetch(`${baseUrl}/api/auth/email-verification/send`, asJson("POST", { email }));
  assert.equal(send.status, 201);
  const { verificationId, previewCode } = await send.json();
  const confirm = await fetch(`${baseUrl}/api/auth/email-verification/confirm`, asJson("POST", { email, verificationId, code: previewCode }));
  assert.equal(confirm.status, 200);
  const { verificationToken } = await confirm.json();
  return verificationToken;
};

test("serves public data and blocks unauthenticated administration endpoints", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const exams = await fetch(`${baseUrl}/api/exams`);
  assert.equal(exams.status, 200);
  assert.equal((await exams.json()).length, 1);

  const denied = await fetch(`${baseUrl}/api/admin/organizations`);
  assert.equal(denied.status, 401);
});

test("manager signup requires a verified email, creates a pending organization request, and blocks non-manager signup", async (context) => {
  const { baseUrl, directory, server } = await startServer();
  context.after(() => server.close());

  // 이메일 인증 없이는 가입할 수 없다.
  const unverifiedSignup = await fetch(`${baseUrl}/api/auth/signup`, asJson("POST", {
    name: "새관리자", email: "new-manager@aivle.com", password: "safe-password", orgName: "C대학교 산업공학과"
  }));
  assert.equal(unverifiedSignup.status, 400);

  const verificationToken = await verifyEmail(baseUrl, "new-manager@aivle.com");

  const signup = await fetch(`${baseUrl}/api/auth/signup`, asJson("POST", {
    name: "새관리자", email: "new-manager@aivle.com", password: "safe-password", orgName: "C대학교 산업공학과", verificationToken
  }));
  assert.equal(signup.status, 201);
  const signupBody = await signup.json();
  assert.equal("password" in signupBody.user, false);
  assert.equal(signupBody.user.role, "MANAGER");
  assert.equal(signupBody.user.orgId, null);
  assert.equal(signupBody.organization.status, "PENDING");

  const database = JSON.parse(await readFile(join(directory, "database.json"), "utf8"));
  const registeredUser = database.users.find((user) => user.email === "new-manager@aivle.com");
  assert.equal(registeredUser.password, undefined);

  // 이미 사용된 인증 토큰으로는 다시 가입할 수 없다.
  const reuseToken = await fetch(`${baseUrl}/api/auth/signup`, asJson("POST", {
    name: "재사용 시도", email: "new-manager@aivle.com", password: "safe-password", orgName: "재사용 조직", verificationToken
  }));
  assert.equal(reuseToken.status, 409);

  // role은 회원가입 요청 바디로 상승시킬 수 없다 (관리자 자가 가입만 허용).
  const blockedAdminToken = await verifyEmail(baseUrl, "blocked-admin@aivle.com");
  const privilegedSignup = await fetch(`${baseUrl}/api/auth/signup`, asJson("POST", {
    name: "권한 상승 시도", email: "blocked-admin@aivle.com", password: "safe-password", orgName: "가짜 조직", role: "ADMIN", verificationToken: blockedAdminToken
  }));
  const privilegedBody = await privilegedSignup.json();
  assert.equal(privilegedSignup.status, 201);
  assert.equal(privilegedBody.user.role, "MANAGER");
});

test("email verification rejects wrong codes and enforces the resend cooldown", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const send = await fetch(`${baseUrl}/api/auth/email-verification/send`, asJson("POST", { email: "verify-me@aivle.com" }));
  assert.equal(send.status, 201);
  const { verificationId } = await send.json();

  const wrongCode = await fetch(`${baseUrl}/api/auth/email-verification/confirm`, asJson("POST", {
    email: "verify-me@aivle.com", verificationId, code: "000000"
  }));
  assert.equal(wrongCode.status, 401);

  const resend = await fetch(`${baseUrl}/api/auth/email-verification/send`, asJson("POST", { email: "verify-me@aivle.com" }));
  assert.equal(resend.status, 429);

  const alreadyRegistered = await fetch(`${baseUrl}/api/auth/email-verification/send`, asJson("POST", { email: "admin@aivle.com" }));
  assert.equal(alreadyRegistered.status, 409);
});

test("login locks out after repeated failures", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failed = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", {
      email: "admin@aivle.com", password: "wrong-password", role: "ADMIN"
    }));
    assert.equal(failed.status, 401);
  }

  const lockedOut = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", {
    email: "admin@aivle.com", password: "123", role: "ADMIN"
  }));
  assert.equal(lockedOut.status, 429);
});

test("manager without an approved organization cannot reach org-scoped APIs", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", {
    email: "pending-manager@aivle.com", password: "123", role: "MANAGER"
  }));
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const exams = await fetch(`${baseUrl}/api/manager/exams`, withAuth(token));
  assert.equal(exams.status, 403);

  const orgStatus = await fetch(`${baseUrl}/api/manager/organization`, withAuth(token));
  assert.equal(orgStatus.status, 200);
  assert.equal((await orgStatus.json()).organization.status, "PENDING");
});

test("ADMIN approves an organization, assigns it to a manager, and the manager gains access immediately", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "admin@aivle.com", password: "123", role: "ADMIN" }));
  assert.equal(adminLogin.status, 200);
  const { token: adminToken } = await adminLogin.json();

  const managerLogin = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "pending-manager@aivle.com", password: "123", role: "MANAGER" }));
  const { token: managerToken, user: manager } = await managerLogin.json();

  const organizations = await (await fetch(`${baseUrl}/api/admin/organizations?status=PENDING`, withAuth(adminToken))).json();
  const pendingOrg = organizations.find((org) => org.requestedBy === manager.id);
  assert.ok(pendingOrg);

  const approve = await fetch(`${baseUrl}/api/admin/organizations/${pendingOrg.id}/approve`, withAuth(adminToken, { method: "PUT" }));
  assert.equal(approve.status, 200);

  const assign = await fetch(`${baseUrl}/api/admin/managers/${manager.id}/assign-org`, withAuth(adminToken, asJson("PUT", { orgId: pendingOrg.id })));
  assert.equal(assign.status, 200);

  // 세션은 토큰->userId만 저장하므로, 재로그인 없이도 최신 orgId가 즉시 반영되어야 한다.
  const exams = await fetch(`${baseUrl}/api/manager/exams`, withAuth(managerToken));
  assert.equal(exams.status, 200);
});

test("manager can register examinees, create an exam, assign candidates, and send invitations", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "manager@aivle.com", password: "123", role: "MANAGER" }));
  const { token } = await login.json();

  const bulkRegister = await fetch(`${baseUrl}/api/manager/examinees`, withAuth(token, asJson("POST", {
    entries: [{ name: "신규응시자", email: "new-examinee@aivle.com" }]
  })));
  assert.equal(bulkRegister.status, 201);
  const { created } = await bulkRegister.json();
  assert.equal(created.length, 1);

  const examCreate = await fetch(`${baseUrl}/api/manager/exams`, withAuth(token, asJson("POST", {
    title: "신규 평가", duration: "60분", questions: "총 3문제", date: "2026.08.01"
  })));
  assert.equal(examCreate.status, 201);
  const exam = await examCreate.json();
  assert.equal(exam.title, "신규 평가");

  const assign = await fetch(`${baseUrl}/api/manager/exams/${exam.id}/assignees`, withAuth(token, asJson("PUT", {
    examineeIds: [created[0].id]
  })));
  assert.equal(assign.status, 200);

  const invite = await fetch(`${baseUrl}/api/manager/exams/${exam.id}/invitations`, withAuth(token, asJson("POST", {})));
  assert.equal(invite.status, 201);
  const inviteBody = await invite.json();
  assert.equal(inviteBody.invitations.length, 1);
  assert.ok(inviteBody.invitations[0].token);
});

test("examinee can enter an exam via the invitation link using the token and exam number", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "manager@aivle.com", password: "123", role: "MANAGER" }));
  const { token } = await login.json();

  const { created } = await (await fetch(`${baseUrl}/api/manager/examinees`, withAuth(token, asJson("POST", {
    entries: [{ name: "응시자테스트", email: "entry-test@aivle.com" }]
  })))).json();
  const examinee = created[0];

  const exam = await (await fetch(`${baseUrl}/api/manager/exams`, withAuth(token, asJson("POST", {
    title: "입장 테스트 시험", duration: "30분", questions: "총 1문제"
  })))).json();

  await fetch(`${baseUrl}/api/manager/exams/${exam.id}/assignees`, withAuth(token, asJson("PUT", { examineeIds: [examinee.id] })));
  const { invitations } = await (await fetch(`${baseUrl}/api/manager/exams/${exam.id}/invitations`, withAuth(token, asJson("POST", {})))).json();
  const invitation = invitations[0];

  // 유효하지 않은 토큰은 거부되어야 한다.
  const invalidLookup = await fetch(`${baseUrl}/api/exam-entry/not-a-real-token`);
  assert.equal(invalidLookup.status, 404);

  // 정상 토큰이면 로그인 없이도 시험 정보를 조회할 수 있어야 한다.
  const lookup = await fetch(`${baseUrl}/api/exam-entry/${invitation.token}`);
  assert.equal(lookup.status, 200);
  const lookupBody = await lookup.json();
  assert.equal(lookupBody.exam.title, "입장 테스트 시험");

  // 응시번호가 틀리면 입장이 거부되어야 한다.
  const wrongNumber = await fetch(`${baseUrl}/api/exam-entry/${invitation.token}/verify`, asJson("POST", { examNumber: "00000000" }));
  assert.equal(wrongNumber.status, 401);

  // 올바른 토큰 + 응시번호 조합이면 입장이 승인되어야 한다.
  const verify = await fetch(`${baseUrl}/api/exam-entry/${invitation.token}/verify`, asJson("POST", { examNumber: examinee.examNumber }));
  assert.equal(verify.status, 200);
  const verifyBody = await verify.json();
  assert.equal(verifyBody.examinee.name, "응시자테스트");
  assert.equal(verifyBody.exam.id, exam.id);
});

test("manager can manage org-scoped exam/problem/cheat policy", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "manager@aivle.com", password: "123", role: "MANAGER" }));
  const { token } = await login.json();

  const addProblem = await fetch(`${baseUrl}/api/manager/policy/problems`, withAuth(token, asJson("POST", {
    title: "신규 문제", points: 20, languages: "Python3"
  })));
  assert.equal(addProblem.status, 201);
  const policyAfterAdd = await addProblem.json();
  assert.equal(policyAfterAdd.problems.length, 2);

  const rules = policyAfterAdd.cheatRules.map((rule) => ({ id: rule.id, enabled: false }));
  const updateRules = await fetch(`${baseUrl}/api/manager/policy/cheat-rules`, withAuth(token, asJson("PUT", { rules })));
  assert.equal(updateRules.status, 200);
  const policyAfterUpdate = await updateRules.json();
  assert.ok(policyAfterUpdate.cheatRules.every((rule) => rule.enabled === false));
});

test("ADMIN manages global system policy and AI configuration", async (context) => {
  const { baseUrl, server } = await startServer();
  context.after(() => server.close());

  const login = await fetch(`${baseUrl}/api/auth/login`, asJson("POST", { email: "admin@aivle.com", password: "123", role: "ADMIN" }));
  const { token } = await login.json();

  const updatePolicy = await fetch(`${baseUrl}/api/admin/system-policy`, withAuth(token, asJson("PUT", { dataRetentionDays: 180 })));
  assert.equal(updatePolicy.status, 200);
  assert.equal((await updatePolicy.json()).systemPolicy.dataRetentionDays, 180);

  const updateAiConfig = await fetch(`${baseUrl}/api/admin/ai-config`, withAuth(token, asJson("PUT", { model: "Claude 3.5 Sonnet", webcamSensitivity: 90 })));
  assert.equal(updateAiConfig.status, 200);
  assert.equal((await updateAiConfig.json()).aiConfig.webcamSensitivity, 90);

  const overview = await fetch(`${baseUrl}/api/admin/overview`, withAuth(token));
  assert.equal(overview.status, 200);
  const overviewBody = await overview.json();
  assert.equal(overviewBody.organizations.total, 2);
});

test("removes plaintext passwords from an existing database and backfills new collections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aivle-api-"));
  const databasePath = join(directory, "database.json");
  await writeFile(databasePath, JSON.stringify({
    users: [{ id: "legacy-user", email: "legacy@aivle.com", password: "legacy-secret", passwordHash: "kept" }],
    exams: [], notices: [], examinees: [], warnings: []
  }));

  await createStore(databasePath);

  const migratedDatabase = JSON.parse(await readFile(databasePath, "utf8"));
  assert.equal(migratedDatabase.users[0].password, undefined);
  assert.equal(migratedDatabase.users[0].passwordHash, "kept");
  assert.deepEqual(migratedDatabase.organizations, []);
  assert.deepEqual(migratedDatabase.invitations, []);
  assert.deepEqual(migratedDatabase.orgPolicies, []);
  assert.ok(migratedDatabase.systemPolicy);
  assert.ok(migratedDatabase.aiConfig);
});
