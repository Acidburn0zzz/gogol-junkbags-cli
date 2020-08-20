import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as ecr from './ecr';
import * as execm from './exec';

export async function login(registry: string, username: string, password: string): Promise<void> {
  if (await ecr.isECR(registry)) {
    await loginECR(registry, username, password);
  } else {
    await loginStandard(registry, username, password);
  }
}

export async function logout(registry: string): Promise<void> {
  await execm.exec('docker', ['logout', registry], false).then(res => {
    if (res.stderr != '' && !res.success) {
      core.warning(res.stderr);
    }
  });
}

export async function loginStandard(registry: string, username: string, password: string): Promise<void> {
  let loginArgs: Array<string> = ['login', '--password', password];
  if (username) {
    loginArgs.push('--username', username);
  }
  loginArgs.push(registry);

  if (registry) {
    core.info(`🔑 Logging into ${registry}...`);
  } else {
    core.info(`🔑 Logging into DockerHub...`);
  }
  await execm.exec('docker', loginArgs, true).then(res => {
    if (res.stderr != '' && !res.success) {
      throw new Error(res.stderr);
    }
    core.info('🎉 Login Succeeded!');
  });
}

export async function loginECR(registry: string, username: string, password: string): Promise<void> {
  await exec.exec('aws', ['--version']);
  const ecrRegion = await ecr.getRegion(registry);
  process.env.AWS_ACCESS_KEY_ID = username;
  process.env.AWS_SECRET_ACCESS_KEY = password;

  core.info(`⬇️ Retrieving docker login command for ECR region ${ecrRegion}...`);
  await execm.exec('aws', ['ecr', 'get-login', '--region', ecrRegion, '--no-include-email'], true).then(res => {
    if (res.stderr != '' && !res.success) {
      throw new Error(res.stderr);
    }
    core.info(`🔑 Logging into ${registry}...`);
    execm.exec(res.stdout, [], true).then(res => {
      if (res.stderr != '' && !res.success) {
        throw new Error(res.stderr);
      }
      core.info('🎉 Login Succeeded!');
    });
  });
}
