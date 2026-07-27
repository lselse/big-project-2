import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { seedData } from "./seed.mjs";

const scrypt = promisify(scryptCallback);

const clone = (value) => structuredClone(value);

const hashPassword = async (password) => {
  const salt = randomUUID();
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
};

export const verifyPassword = async (password, passwordHash) => {
  const [salt, storedHash] = passwordHash.split(":");
  const derivedKey = await scrypt(password, salt, 64);
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(derivedKey));
};

const normalizeSeed = async () => ({
  ...clone(seedData),
  users: await Promise.all(seedData.users.map(async ({ password, ...user }) => ({
    ...user,
    passwordHash: await hashPassword(password)
  })))
});

export const createStore = async (filePath) => {
  let data;
  let shouldSave = false;
  try {
    data = JSON.parse(await readFile(filePath, "utf8"));
    if (data.users.some((user) => Object.hasOwn(user, "password"))) {
      data = {
        ...data,
        users: data.users.map(({ password, ...user }) => user)
      };
      shouldSave = true;
    }
    // 기존 데이터베이스 파일에 조직/초대 테이블이 없다면 보강한다.
    if (!Array.isArray(data.organizations)) {
      data = { ...data, organizations: [] };
      shouldSave = true;
    }
    if (!Array.isArray(data.invitations)) {
      data = { ...data, invitations: [] };
      shouldSave = true;
    }
    if (!Array.isArray(data.orgPolicies)) {
      data = { ...data, orgPolicies: [] };
      shouldSave = true;
    }
    if (!Array.isArray(data.emailVerifications)) {
      data = { ...data, emailVerifications: [] };
      shouldSave = true;
    }
    if (!data.systemPolicy) {
      data = { ...data, systemPolicy: clone(seedData.systemPolicy) };
      shouldSave = true;
    }
    if (!data.aiConfig) {
      data = { ...data, aiConfig: clone(seedData.aiConfig) };
      shouldSave = true;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    data = await normalizeSeed();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
  }

  const save = async () => {
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(data, null, 2));
    await rename(temporaryPath, filePath);
  };

  if (shouldSave) await save();

  return {
    get users() { return data.users; },
    get organizations() { return data.organizations; },
    get exams() { return data.exams; },
    get notices() { return data.notices; },
    get examinees() { return data.examinees; },
    get invitations() { return data.invitations; },
    get warnings() { return data.warnings; },
    get orgPolicies() { return data.orgPolicies; },
    get systemPolicy() { return data.systemPolicy; },
    get aiConfig() { return data.aiConfig; },
    get emailVerifications() { return data.emailVerifications; },

    addUser: async ({ password, ...user }) => {
      const created = { ...user, passwordHash: await hashPassword(password) };
      data.users.push(created);
      await save();
      return created;
    },
    updateUser: async (userId, patch) => {
      const user = data.users.find((candidate) => candidate.id === userId);
      if (!user) throw new Error("사용자를 찾을 수 없습니다.");
      Object.assign(user, patch);
      await save();
      return user;
    },

    addOrganization: async (organization) => {
      data.organizations.push(organization);
      await save();
      return organization;
    },
    updateOrganization: async (organizationId, patch) => {
      const organization = data.organizations.find((candidate) => candidate.id === organizationId);
      if (!organization) throw new Error("조직을 찾을 수 없습니다.");
      Object.assign(organization, patch);
      await save();
      return organization;
    },

    addExam: async (exam) => {
      data.exams.unshift(exam);
      await save();
      return exam;
    },

    addExaminees: async (examinees) => {
      data.examinees.unshift(...examinees);
      await save();
      return examinees;
    },
    updateExaminee: async (examineeId, patch) => {
      const examinee = data.examinees.find((candidate) => candidate.id === examineeId);
      if (!examinee) throw new Error("응시자를 찾을 수 없습니다.");
      Object.assign(examinee, patch);
      await save();
      return examinee;
    },

    addInvitations: async (invitations) => {
      data.invitations.unshift(...invitations);
      await save();
      return invitations;
    },

    addWarning: async (warning) => {
      data.warnings.push(warning);
      await save();
      return warning;
    },

    getOrgPolicy: async (orgId) => {
      let policy = data.orgPolicies.find((candidate) => candidate.orgId === orgId);
      if (!policy) {
        policy = { orgId, problems: [], cheatRules: [] };
        data.orgPolicies.push(policy);
        await save();
      }
      return policy;
    },
    addPolicyProblem: async (orgId, problem) => {
      let policy = data.orgPolicies.find((candidate) => candidate.orgId === orgId);
      if (!policy) {
        policy = { orgId, problems: [], cheatRules: [] };
        data.orgPolicies.push(policy);
      }
      policy.problems.push(problem);
      await save();
      return policy;
    },
    updatePolicyCheatRules: async (orgId, rules) => {
      let policy = data.orgPolicies.find((candidate) => candidate.orgId === orgId);
      if (!policy) {
        policy = { orgId, problems: [], cheatRules: [] };
        data.orgPolicies.push(policy);
      }
      policy.cheatRules = rules.map((rule) => {
        const existing = policy.cheatRules.find((candidate) => candidate.id === rule.id);
        return {
          id: rule.id,
          label: rule.label ?? existing?.label ?? "",
          enabled: Boolean(rule.enabled)
        };
      });
      await save();
      return policy;
    },

    addEmailVerification: async (verification) => {
      data.emailVerifications.push(verification);
      await save();
      return verification;
    },
    updateEmailVerification: async (verificationId, patch) => {
      const verification = data.emailVerifications.find((candidate) => candidate.id === verificationId);
      if (!verification) throw new Error("인증 요청을 찾을 수 없습니다.");
      Object.assign(verification, patch);
      await save();
      return verification;
    },

    updateSystemPolicy: async (patch) => {
      Object.assign(data.systemPolicy, patch);
      await save();
      return data.systemPolicy;
    },
    updateAiConfig: async (patch) => {
      Object.assign(data.aiConfig, patch);
      await save();
      return data.aiConfig;
    }
  };
};
